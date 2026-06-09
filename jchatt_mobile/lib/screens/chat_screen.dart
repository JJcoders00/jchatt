import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../main.dart';
import '../models/user_model.dart';
import '../models/message_model.dart';
import '../services/database_service.dart';
import '../services/messaging_service.dart';

/// Chat screen — full messaging interface with:
/// - Blue ticks (read receipts)
/// - Typing indicators
/// - Online/last seen status
/// - Emoji picker
/// - Image sharing
/// - Reply/quote
/// - Message context menu (copy, reply, delete)
class ChatScreen extends StatefulWidget {
  final String chatId;
  final JchattUser? otherUser;

  const ChatScreen({
    super.key,
    required this.chatId,
    required this.otherUser,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _imagePicker = ImagePicker();

  List<Message> _messages = [];
  String _onlineStatus = '';
  Color _onlineColor = const Color(0xFF94a3b8);
  bool _isTyping = false;
  String? _selectedImageBase64;
  Message? _replyToMessage;
  bool _showEmojiPicker = false;
  bool _isLoading = true;

  // Subscriptions
  StreamSubscription? _messageSubscription;
  StreamSubscription? _receiptSubscription;
  StreamSubscription? _typingSubscription;
  StreamSubscription? _presenceSubscription;

  // Emoji list (matching web app)
  static const _emojis = [
    '😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😭', '😡', '🥳',
    '👍', '👎', '❤️', '🔥', '💯', '🎉', '✨', '💀', '🙏', '👋',
    '🤝', '✌️', '🤗', '😴', '🥺', '😏', '🤣', '😇', '🤩', '🫡',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupListeners();
    _loadMessages();
  }

  void _setupListeners() {
    // Listen for new messages
    _messageSubscription = MessagingService.onMessage.listen((chatId) {
      if (chatId == widget.chatId) {
        _loadMessages();
      }
    });

    // Subscribe to receipts for blue ticks
    _receiptSubscription = MessagingService.subscribeToReceipts(
      widget.chatId,
      (receipts) async {
        // Update local DB with receipt statuses
        for (final entry in receipts.entries) {
          final msgId = entry.key;
          final receipt = entry.value;
          if (receipt is Map) {
            final status = receipt['status'] as String?;
            if (status != null) {
              await DatabaseService.updateMessageStatus(
                  widget.chatId, msgId, status);
            }
          }
        }
        _loadMessages(scroll: false);
      },
    );

    // Subscribe to presence (online/last seen)
    if (widget.otherUser != null) {
      _presenceSubscription = MessagingService.subscribeToPresence(
        widget.otherUser!.uid,
        (lastSeenMs) {
          if (!mounted) return;
          if (lastSeenMs == null) {
            setState(() {
              _onlineStatus = '';
              _onlineColor = const Color(0xFF94a3b8);
            });
            return;
          }

          final diff = DateTime.now().millisecondsSinceEpoch - lastSeenMs;
          if (diff < 120000) {
            setState(() {
              _onlineStatus = _isTyping ? 'typing...' : 'Online';
              _onlineColor = const Color(0xFF10b981);
            });
          } else {
            final date = DateTime.fromMillisecondsSinceEpoch(lastSeenMs);
            final now = DateTime.now();
            final time = DateFormat.Hm().format(date);
            final prefix = (date.year == now.year &&
                    date.month == now.month &&
                    date.day == now.day)
                ? 'today at $time'
                : '${DateFormat('MMM d').format(date)} at $time';
            setState(() {
              _onlineStatus = 'Last seen $prefix';
              _onlineColor = const Color(0xFF94a3b8);
            });
          }
        },
      );

      // Subscribe to typing indicators
      _typingSubscription = MessagingService.subscribeToTyping(
        widget.chatId,
        (typingUsers) {
          if (!mounted) return;
          final isTyping = typingUsers.isNotEmpty;
          setState(() {
            _isTyping = isTyping;
            if (isTyping) {
              _onlineStatus = 'typing...';
              _onlineColor = const Color(0xFF10b981);
            }
          });
        },
      );
    }
  }

  Future<void> _loadMessages({bool scroll = true}) async {
    final messages = await DatabaseService.getMessagesForChat(widget.chatId);

    if (mounted) {
      setState(() {
        _messages = messages;
        _isLoading = false;
      });

      // Mark as read
      await MessagingService.markChatAsRead(widget.chatId, messages);

      if (scroll) {
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _selectedImageBase64 ?? _messageController.text.trim();
    if (text.isEmpty) return;

    final myUid = FirebaseAuth.instance.currentUser?.uid;
    if (myUid == null) return;

    final otherUid =
        widget.chatId.split('__').firstWhere((id) => id != myUid, orElse: () => '');
    if (otherUid.isEmpty) return;

    _messageController.clear();
    final replyText = _replyToMessage?.text;
    setState(() {
      _selectedImageBase64 = null;
      _replyToMessage = null;
      _showEmojiPicker = false;
    });

    // Stop typing
    MessagingService.setTyping(widget.chatId, false);

    try {
      await MessagingService.sendMessage(
        widget.chatId,
        otherUid,
        text,
        replyTo: replyText != null
            ? (replyText.startsWith('data:image')
                ? '📷 Photo'
                : replyText.length > 60
                    ? '${replyText.substring(0, 60)}...'
                    : replyText)
            : null,
      );
      await _loadMessages();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send: ${e.toString()}'),
            backgroundColor: const Color(0xFFef4444),
          ),
        );
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 50,
      );
      if (picked == null) return;

      final bytes = await picked.readAsBytes();
      final base64 = base64Encode(bytes);
      final mimeType = picked.path.endsWith('.png') ? 'image/png' : 'image/jpeg';

      setState(() {
        _selectedImageBase64 = 'data:$mimeType;base64,$base64';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to pick image')),
        );
      }
    }
  }

  Future<void> _takePhoto() async {
    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 50,
      );
      if (picked == null) return;

      final bytes = await picked.readAsBytes();
      final base64Str = base64Encode(bytes);

      setState(() {
        _selectedImageBase64 = 'data:image/jpeg;base64,$base64Str';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to take photo')),
        );
      }
    }
  }

  void _showAttachmentOptions() {
    final colors = Theme.of(context).extension<JchattColors>()!;
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.borderColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _AttachOption(
                  icon: Icons.photo_library_rounded,
                  label: 'Gallery',
                  color: const Color(0xFF6366f1),
                  onTap: () {
                    Navigator.pop(context);
                    _pickImage();
                  },
                ),
                _AttachOption(
                  icon: Icons.camera_alt_rounded,
                  label: 'Camera',
                  color: const Color(0xFF10b981),
                  onTap: () {
                    Navigator.pop(context);
                    _takePhoto();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showMessageMenu(Message msg, bool isMe, Offset? position) {
    final colors = Theme.of(context).extension<JchattColors>()!;
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: colors.borderColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: Icon(Icons.reply_rounded, color: colors.textPrimary),
              title: Text('Reply',
                  style: TextStyle(color: colors.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                setState(() => _replyToMessage = msg);
              },
            ),
            ListTile(
              leading: Icon(Icons.copy_rounded, color: colors.textPrimary),
              title: Text('Copy',
                  style: TextStyle(color: colors.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                final text = msg.isImage ? '[Photo]' : msg.text;
                Clipboard.setData(ClipboardData(text: text));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Copied to clipboard'),
                    backgroundColor: colors.accent,
                    duration: const Duration(seconds: 1),
                  ),
                );
              },
            ),
            if (isMe)
              ListTile(
                leading: const Icon(Icons.delete_outline_rounded,
                    color: Color(0xFFef4444)),
                title: const Text('Delete',
                    style: TextStyle(color: Color(0xFFef4444))),
                onTap: () async {
                  Navigator.pop(context);
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Delete message?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Delete',
                              style: TextStyle(color: Color(0xFFef4444))),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await DatabaseService.deleteMessage(
                        widget.chatId, msg.id);
                    _loadMessages();
                  }
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _messageSubscription?.cancel();
    _receiptSubscription?.cancel();
    _typingSubscription?.cancel();
    _presenceSubscription?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    // Stop typing when leaving
    MessagingService.setTyping(widget.chatId, false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<JchattColors>()!;
    final myUid = FirebaseAuth.instance.currentUser?.uid ?? '';
    final name = widget.otherUser?.displayName ?? 'Unknown';
    final avatarUrl = widget.otherUser?.avatarUrl ?? '';

    return Scaffold(
      backgroundColor: colors.bgChat,
      body: SafeArea(
        child: Column(
          children: [
            // ─── Chat Header ──────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: colors.bgPanel.withOpacity(0.95),
                border: Border(
                  bottom: BorderSide(color: colors.borderColor),
                ),
              ),
              child: Row(
                children: [
                  // Back button
                  IconButton(
                    icon: Icon(Icons.arrow_back_rounded,
                        color: colors.textPrimary),
                    onPressed: () => Navigator.pop(context),
                  ),
                  // Avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundImage: avatarUrl.isNotEmpty
                        ? CachedNetworkImageProvider(avatarUrl)
                        : null,
                    child: avatarUrl.isEmpty
                        ? Text(name[0].toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.w600))
                        : null,
                  ),
                  const SizedBox(width: 12),
                  // Name + Status
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              color: colors.textPrimary,
                            )),
                        if (_onlineStatus.isNotEmpty)
                          Text(_onlineStatus,
                              style: TextStyle(
                                fontSize: 12,
                                color: _onlineColor,
                                fontWeight: FontWeight.w500,
                              )),
                      ],
                    ),
                  ),
                  // Action buttons
                  IconButton(
                    icon: Icon(Icons.phone_rounded,
                        color: colors.textSecondary),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Calling coming soon!')),
                      );
                    },
                  ),
                  IconButton(
                    icon: Icon(Icons.videocam_rounded,
                        color: colors.textSecondary),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Video calling coming soon!')),
                      );
                    },
                  ),
                ],
              ),
            ),

            // ─── Messages ─────────────────────────────────────────────────
            Expanded(
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                          color: colors.accent, strokeWidth: 2))
                  : _messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_outlined,
                                  size: 48,
                                  color: colors.textSecondary.withOpacity(0.5)),
                              const SizedBox(height: 12),
                              Text('No messages yet',
                                  style: TextStyle(
                                    color: colors.textSecondary,
                                    fontSize: 15,
                                  )),
                              Text('Say hello! 👋',
                                  style: TextStyle(
                                    color:
                                        colors.textSecondary.withOpacity(0.7),
                                    fontSize: 13,
                                  )),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          itemCount: _messages.length + (_isTyping ? 1 : 0),
                          itemBuilder: (context, index) {
                            // Typing indicator at the bottom
                            if (index == _messages.length && _isTyping) {
                              return _TypingBubble(colors: colors);
                            }

                            final msg = _messages[index];
                            final isMe = msg.senderId == myUid;

                            // Date header
                            Widget? dateHeader;
                            if (index == 0 ||
                                _shouldShowDateHeader(
                                    _messages[index - 1], msg)) {
                              dateHeader = _DateHeader(
                                date: msg.timestampDate,
                                colors: colors,
                              );
                            }

                            return Column(
                              children: [
                                if (dateHeader != null) dateHeader,
                                _MessageBubble(
                                  message: msg,
                                  isMe: isMe,
                                  colors: colors,
                                  onLongPress: () =>
                                      _showMessageMenu(msg, isMe, null),
                                ),
                              ],
                            );
                          },
                        ),
            ),

            // ─── Reply Preview ────────────────────────────────────────────
            if (_replyToMessage != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: colors.bgPanel,
                  border: Border(
                    left: BorderSide(color: colors.accent, width: 3),
                    top: BorderSide(color: colors.borderColor),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.reply_rounded,
                        color: colors.accent, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _replyToMessage!.isImage
                            ? '📷 Photo'
                            : _replyToMessage!.text.length > 60
                                ? '${_replyToMessage!.text.substring(0, 60)}...'
                                : _replyToMessage!.text,
                        style: TextStyle(
                            color: colors.textSecondary, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded,
                          color: colors.textSecondary, size: 18),
                      onPressed: () =>
                          setState(() => _replyToMessage = null),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

            // ─── Image Preview ────────────────────────────────────────────
            if (_selectedImageBase64 != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.bgPanel,
                  border: Border(
                    top: BorderSide(color: colors.borderColor),
                  ),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(
                        _decodeBase64Image(_selectedImageBase64!),
                        width: 60,
                        height: 60,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 60,
                          height: 60,
                          color: colors.bgMain,
                          child: Icon(Icons.broken_image,
                              color: colors.textSecondary),
                        ),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: Color(0xFFef4444)),
                      onPressed: () =>
                          setState(() => _selectedImageBase64 = null),
                    ),
                  ],
                ),
              ),

            // ─── Emoji Picker ─────────────────────────────────────────────
            if (_showEmojiPicker)
              Container(
                height: 200,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.bgPanel,
                  border: Border(
                    top: BorderSide(color: colors.borderColor),
                  ),
                ),
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 8,
                    mainAxisSpacing: 4,
                    crossAxisSpacing: 4,
                  ),
                  itemCount: _emojis.length,
                  itemBuilder: (context, index) {
                    return GestureDetector(
                      onTap: () {
                        _messageController.text += _emojis[index];
                        _messageController.selection =
                            TextSelection.fromPosition(
                          TextPosition(
                              offset: _messageController.text.length),
                        );
                      },
                      child: Center(
                        child: Text(_emojis[index],
                            style: const TextStyle(fontSize: 28)),
                      ),
                    );
                  },
                ),
              ),

            // ─── Message Input ────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: colors.bgPanel,
                border: Border(
                  top: BorderSide(color: colors.borderColor),
                ),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    // Attach button
                    _InputActionButton(
                      icon: Icons.image_rounded,
                      color: colors.textSecondary,
                      onTap: _showAttachmentOptions,
                    ),

                    // Text input
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: colors.bgMain,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: colors.borderColor),
                        ),
                        child: TextField(
                          controller: _messageController,
                          maxLines: 4,
                          minLines: 1,
                          style: TextStyle(
                              color: colors.textPrimary, fontSize: 15),
                          decoration: InputDecoration(
                            hintText: 'Message...',
                            hintStyle: TextStyle(
                                color: colors.textSecondary.withOpacity(0.7)),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 10),
                          ),
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _sendMessage(),
                          onChanged: (text) {
                            MessagingService.setTyping(
                                widget.chatId, text.isNotEmpty);
                          },
                        ),
                      ),
                    ),

                    // Emoji button
                    _InputActionButton(
                      icon: _showEmojiPicker
                          ? Icons.keyboard_rounded
                          : Icons.emoji_emotions_outlined,
                      color: colors.textSecondary,
                      onTap: () {
                        setState(
                            () => _showEmojiPicker = !_showEmojiPicker);
                      },
                    ),

                    // Send button
                    Container(
                      decoration: BoxDecoration(
                        color: colors.accent,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: colors.accent.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                        onPressed: _sendMessage,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _shouldShowDateHeader(Message prev, Message current) {
    final prevDate = prev.timestampDate;
    final currDate = current.timestampDate;
    return prevDate.year != currDate.year ||
        prevDate.month != currDate.month ||
        prevDate.day != currDate.day;
  }

  Uint8List _decodeBase64Image(String dataUrl) {
    final base64String = dataUrl.split(',').last;
    return base64Decode(base64String);
  }
}

// ─── Message Bubble Widget ──────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMe;
  final JchattColors colors;
  final VoidCallback onLongPress;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    required this.colors,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final time = DateFormat.Hm().format(message.timestampDate);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: () {
          HapticFeedback.mediumImpact();
          onLongPress();
        },
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isMe ? colors.msgOut : colors.msgIn,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: isMe
                  ? const Radius.circular(18)
                  : const Radius.circular(4),
              bottomRight: isMe
                  ? const Radius.circular(4)
                  : const Radius.circular(18),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Reply context
              if (message.replyTo != null && message.replyTo!.isNotEmpty)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 6),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border(
                      left: BorderSide(color: colors.accent, width: 2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.reply_rounded,
                          size: 14,
                          color: isMe
                              ? Colors.white70
                              : colors.textSecondary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          message.replyTo!,
                          style: TextStyle(
                            fontSize: 12,
                            color: isMe
                                ? Colors.white70
                                : colors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

              // Content
              if (message.isImage)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.memory(
                    _decodeBase64(message.text),
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 100,
                      color: colors.bgMain,
                      child: Center(
                        child: Icon(Icons.broken_image,
                            color: colors.textSecondary),
                      ),
                    ),
                  ),
                )
              else
                SizedBox(
                  width: double.infinity,
                  child: Text(
                    message.text,
                    style: TextStyle(
                      fontSize: 15,
                      color: isMe ? Colors.white : colors.msgInText,
                      height: 1.4,
                    ),
                  ),
                ),

              const SizedBox(height: 4),

              // Time + Status
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 11,
                      color: isMe
                          ? Colors.white.withOpacity(0.8)
                          : colors.textSecondary,
                    ),
                  ),
                  if (isMe) ...[
                    const SizedBox(width: 4),
                    _StatusIcon(status: message.status),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Uint8List _decodeBase64(String dataUrl) {
    final base64String = dataUrl.split(',').last;
    return base64Decode(base64String);
  }
}

// ─── Status Icon (Blue Ticks) ───────────────────────────────────────────────

class _StatusIcon extends StatelessWidget {
  final String status;

  const _StatusIcon({required this.status});

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case 'read':
        return const Icon(Icons.done_all_rounded,
            size: 16, color: Color(0xFF3b82f6));
      case 'delivered':
        return Icon(Icons.done_all_rounded,
            size: 16, color: Colors.white.withOpacity(0.6));
      default: // 'sent'
        return Icon(Icons.done_rounded,
            size: 14, color: Colors.white.withOpacity(0.6));
    }
  }
}

// ─── Date Header ────────────────────────────────────────────────────────────

class _DateHeader extends StatelessWidget {
  final DateTime date;
  final JchattColors colors;

  const _DateHeader({required this.date, required this.colors});

  @override
  Widget build(BuildContext context) {
    final text = DateFormat('EEEE, MMM d').format(date);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: colors.bgPanel.withOpacity(0.8),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: colors.borderColor),
          ),
          child: Text(text,
              style: TextStyle(
                fontSize: 12,
                color: colors.textSecondary,
                fontWeight: FontWeight.w500,
              )),
        ),
      ),
    );
  }
}

// ─── Typing Indicator Bubble ────────────────────────────────────────────────

class _TypingBubble extends StatefulWidget {
  final JchattColors colors;

  const _TypingBubble({required this.colors});

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: widget.colors.msgIn,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
            bottomLeft: Radius.circular(4),
          ),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                final delay = i * 0.2;
                final value = ((_controller.value + delay) % 1.0);
                final opacity = 0.3 + 0.7 * (value < 0.5 ? value * 2 : (1 - value) * 2);
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: widget.colors.accent.withOpacity(opacity),
                    shape: BoxShape.circle,
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}

// ─── Input Action Button ────────────────────────────────────────────────────

class _InputActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _InputActionButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: const BoxDecoration(shape: BoxShape.circle),
        child: Icon(icon, color: color, size: 24),
      ),
    );
  }
}

// ─── Attachment Option ──────────────────────────────────────────────────────

class _AttachOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _AttachOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<JchattColors>()!;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: TextStyle(color: colors.textSecondary, fontSize: 12)),
        ],
      ),
    );
  }
}
