import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../main.dart';
import '../models/chat_model.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/database_service.dart';
import '../services/messaging_service.dart';
import '../services/notification_service.dart';

/// Home screen — Chat list (like WhatsApp main screen)
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final _authService = AuthService();
  final _searchController = TextEditingController();
  List<Chat> _chats = [];
  List<Chat> _filteredChats = [];
  bool _isLoading = true;
  StreamSubscription? _messageSubscription;
  StreamSubscription? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    // Register user in RTDB & setup presence
    await MessagingService.registerUser(user);
    MessagingService.setupPresence(user.uid);

    // Initialize notifications
    await NotificationService.initialize();

    // Start listening for incoming messages
    MessagingService.listenForPendingMessages(user.uid);

    // Listen for message events to refresh chat list
    _messageSubscription = MessagingService.onMessage.listen((_) {
      _loadChats();
    });

    // Listen for notifications
    _notificationSubscription = MessagingService.onNotification.listen((msg) {
      NotificationService.showMessageNotification(
        senderName: msg['senderName'] ?? 'Someone',
        messageText: msg['text'] ?? '',
        senderPhoto: msg['senderPhoto'],
      );
    });

    // Ensure user exists in local DB
    await DatabaseService.upsertUser(JchattUser(
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
      photoURL: user.photoURL ?? '',
    ));

    await _loadChats();

    // Purge old messages
    DatabaseService.purgeOldMessages();
  }

  Future<void> _loadChats() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final rawChats = await DatabaseService.getChatsForUser(user.uid);
    final enriched = <Chat>[];

    for (final chat in rawChats) {
      final otherUid = chat.memberUids.firstWhere(
        (id) => id != user.uid,
        orElse: () => '',
      );

      if (otherUid.isEmpty) continue;

      // Try local first, then RTDB
      var otherUser = await DatabaseService.getUserByUid(otherUid);
      if (otherUser == null) {
        final remote = await MessagingService.lookupUserByUid(otherUid);
        if (remote != null) {
          otherUser = remote;
          await DatabaseService.upsertUser(remote);
        }
      }

      chat.otherUser = otherUser ?? JchattUser(
        uid: otherUid,
        email: '',
        displayName: 'Unknown',
      );

      // Count unread
      chat.unreadCount = await DatabaseService.getUnreadCount(chat.id, user.uid);
      enriched.add(chat);
    }

    if (mounted) {
      setState(() {
        _chats = enriched;
        _filteredChats = _filterChats(enriched);
        _isLoading = false;
      });
    }
  }

  List<Chat> _filterChats(List<Chat> chats) {
    final query = _searchController.text.toLowerCase();
    if (query.isEmpty) return chats;
    return chats
        .where((c) =>
            c.otherUser?.displayName.toLowerCase().contains(query) ?? false)
        .toList();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadChats();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _messageSubscription?.cancel();
    _notificationSubscription?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _showNewChatDialog() {
    final emailController = TextEditingController();
    String? error;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final colors = Theme.of(context).extension<JchattColors>()!;
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 24,
                right: 24,
                top: 32,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: colors.borderColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Start a Conversation',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w600,
                        color: colors.textPrimary,
                      )),
                  const SizedBox(height: 8),
                  Text('Connect instantly via email.',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 14,
                      )),
                  const SizedBox(height: 24),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofocus: true,
                    style: TextStyle(color: colors.textPrimary),
                    decoration: const InputDecoration(
                      labelText: 'Email Address',
                      hintText: 'e.g. hello@jchatt.com',
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 8),
                    Text(error!,
                        style: const TextStyle(
                            color: Color(0xFFef4444), fontSize: 13)),
                  ],
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            final email = emailController.text.trim();
                            if (email.isEmpty) return;

                            final myUser = FirebaseAuth.instance.currentUser;
                            if (myUser == null) return;

                            if (email.toLowerCase() ==
                                myUser.email?.toLowerCase()) {
                              setSheetState(() {
                                error = 'You cannot chat with yourself.';
                              });
                              return;
                            }

                            // Lookup user
                            var otherUser =
                                await DatabaseService.getUserByEmail(email);
                            if (otherUser == null) {
                              final remote =
                                  await MessagingService.lookupUserByEmail(
                                      email);
                              if (remote == null) {
                                setSheetState(() {
                                  error =
                                      'No user found. They must sign in to Jchatt first.';
                                });
                                return;
                              }
                              otherUser = remote;
                              await DatabaseService.upsertUser(remote);
                            }

                            final chat = await DatabaseService.findOrCreateChat(
                                myUser.uid, otherUser.uid);

                            if (mounted) {
                              Navigator.pop(context);
                              await _loadChats();
                              Navigator.pushNamed(context, '/chat', arguments: {
                                'chatId': chat.id,
                                'otherUser': otherUser,
                              });
                            }
                          },
                          child: const Text('Start Chat'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showSettingsSheet() {
    final appState = context.findAncestorStateOfType<JchattAppState>();
    if (appState == null) return;

    String selectedTheme = appState.themeName;
    Color selectedColor = appState.accentColor;

    final accentColors = [
      const Color(0xFF6366f1),
      const Color(0xFF10b981),
      const Color(0xFFf43f5e),
      const Color(0xFF8b5cf6),
      const Color(0xFFf59e0b),
    ];

    showModalBottomSheet(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final colors = Theme.of(context).extension<JchattColors>()!;
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: colors.borderColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Appearance',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w600,
                        color: colors.textPrimary,
                      )),
                  const SizedBox(height: 8),
                  Text('Customize your experience.',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 14,
                      )),
                  const SizedBox(height: 24),

                  // Theme selector
                  Text('Theme',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      )),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: colors.bgMain,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colors.borderColor),
                    ),
                    child: DropdownButton<String>(
                      value: selectedTheme,
                      isExpanded: true,
                      underline: const SizedBox(),
                      dropdownColor: colors.bgPanel,
                      style: TextStyle(color: colors.textPrimary, fontSize: 15),
                      items: const [
                        DropdownMenuItem(
                            value: 'dark', child: Text('Pro Dark (Default)')),
                        DropdownMenuItem(
                            value: 'light', child: Text('Clean Light')),
                        DropdownMenuItem(
                            value: 'midnight', child: Text('Midnight Blue')),
                      ],
                      onChanged: (v) {
                        if (v != null) {
                          setSheetState(() => selectedTheme = v);
                        }
                      },
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Color picker
                  Text('Accent Color',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      )),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: accentColors.map((color) {
                      final isSelected = color.value == selectedColor.value;
                      return GestureDetector(
                        onTap: () {
                          setSheetState(() => selectedColor = color);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(right: 12),
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                            border: isSelected
                                ? Border.all(color: Colors.white, width: 3)
                                : null,
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: color.withOpacity(0.5),
                                      blurRadius: 8,
                                      spreadRadius: 2,
                                    )
                                  ]
                                : null,
                          ),
                          child: isSelected
                              ? const Icon(Icons.check,
                                  color: Colors.white, size: 18)
                              : null,
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 28),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        appState.setTheme(selectedTheme, selectedColor);
                        Navigator.pop(context);
                      },
                      child: const Text('Done'),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<JchattColors>()!;
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: colors.bgPanel,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: colors.bgPanel,
                border: Border(
                  bottom: BorderSide(color: colors.borderColor),
                ),
              ),
              child: Row(
                children: [
                  // User avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundImage: user?.photoURL != null
                        ? CachedNetworkImageProvider(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            (user?.displayName ?? 'U')[0].toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      user?.displayName ?? user?.email?.split('@')[0] ?? 'User',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.palette_outlined,
                        color: colors.textSecondary),
                    onPressed: _showSettingsSheet,
                  ),
                  IconButton(
                    icon: Icon(Icons.logout_rounded,
                        color: colors.textSecondary),
                    onPressed: () async {
                      await _authService.signOut();
                      MessagingService.dispose();
                      if (mounted) {
                        Navigator.pushReplacementNamed(context, '/login');
                      }
                    },
                  ),
                ],
              ),
            ),

            // Search + New Chat
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: colors.bgMain,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: colors.borderColor),
                      ),
                      child: TextField(
                        controller: _searchController,
                        style: TextStyle(
                            color: colors.textPrimary, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Search chats...',
                          prefixIcon: Icon(Icons.search,
                              color: colors.textSecondary, size: 20),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onChanged: (_) {
                          setState(() {
                            _filteredChats = _filterChats(_chats);
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: colors.accent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: colors.accent.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.add, color: Colors.white),
                      onPressed: _showNewChatDialog,
                    ),
                  ),
                ],
              ),
            ),

            // Chat List
            Expanded(
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: colors.accent,
                        strokeWidth: 2,
                      ),
                    )
                  : _filteredChats.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_bubble_outline,
                                  size: 48, color: colors.textSecondary),
                              const SizedBox(height: 16),
                              Text(
                                'No chats yet',
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tap + to start a new chat!',
                                style: TextStyle(
                                  color: colors.textSecondary.withOpacity(0.7),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          color: colors.accent,
                          onRefresh: _loadChats,
                          child: ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: _filteredChats.length,
                            itemBuilder: (context, index) {
                              return _ChatTile(
                                chat: _filteredChats[index],
                                onTap: () async {
                                  await Navigator.pushNamed(
                                    context,
                                    '/chat',
                                    arguments: {
                                      'chatId': _filteredChats[index].id,
                                      'otherUser':
                                          _filteredChats[index].otherUser,
                                    },
                                  );
                                  _loadChats();
                                },
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Single chat tile in the list
class _ChatTile extends StatelessWidget {
  final Chat chat;
  final VoidCallback onTap;

  const _ChatTile({required this.chat, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<JchattColors>()!;
    final name = chat.otherUser?.displayName ?? 'Unknown';
    final avatarUrl = chat.otherUser?.avatarUrl ?? '';

    // Format time
    String timeString = '';
    if (chat.lastTimestamp > 0) {
      final date = DateTime.fromMillisecondsSinceEpoch(chat.lastTimestamp);
      final now = DateTime.now();
      if (date.year == now.year &&
          date.month == now.month &&
          date.day == now.day) {
        timeString = DateFormat.Hm().format(date);
      } else {
        timeString = DateFormat('MMM d').format(date);
      }
    }

    // Display last message
    String lastMsg = chat.lastMessage;
    if (lastMsg.startsWith('data:image')) lastMsg = '📷 Photo';
    if (lastMsg.isEmpty) lastMsg = 'No messages yet';

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(
              color: chat.unreadCount > 0 ? colors.accent : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 24,
              backgroundColor: colors.bgMain,
              backgroundImage: avatarUrl.isNotEmpty
                  ? CachedNetworkImageProvider(avatarUrl)
                  : null,
              child: avatarUrl.isEmpty
                  ? Text(name[0].toUpperCase(),
                      style: TextStyle(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w600))
                  : null,
            ),
            const SizedBox(width: 16),

            // Chat info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(name,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                              color: colors.textPrimary,
                            ),
                            overflow: TextOverflow.ellipsis),
                      ),
                      Text(timeString,
                          style: TextStyle(
                            fontSize: 12,
                            color: chat.unreadCount > 0
                                ? colors.accent
                                : colors.textSecondary,
                            fontWeight: chat.unreadCount > 0
                                ? FontWeight.w600
                                : FontWeight.w500,
                          )),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lastMsg,
                          style: TextStyle(
                            fontSize: 13,
                            color: colors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (chat.unreadCount > 0)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: colors.accent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            chat.unreadCount > 99
                                ? '99+'
                                : '${chat.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
