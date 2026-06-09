import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:uuid/uuid.dart';
import '../models/user_model.dart';
import '../models/message_model.dart';
import 'database_service.dart';

/// Messaging service — replaces peer.js P2P layer from web.
/// Uses Firebase RTDB for message delivery (the `/pending` queue approach,
/// which was already the reliable fallback in the web version).
/// Also handles: read receipts, typing indicators, and user presence.
class MessagingService {
  static final FirebaseDatabase _rtdb = FirebaseDatabase.instance;
  static const _uuid = Uuid();

  // Event stream controllers
  static final _messageController = StreamController<String>.broadcast();
  static final _notificationController = StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of chatId when new messages arrive
  static Stream<String> get onMessage => _messageController.stream;

  /// Stream of notification data (senderName, text, etc.)
  static Stream<Map<String, dynamic>> get onNotification => _notificationController.stream;

  // Active subscriptions
  static StreamSubscription? _pendingSubscription;
  static final Map<String, StreamSubscription> _receiptSubscriptions = {};
  static final Map<String, StreamSubscription> _typingSubscriptions = {};
  static StreamSubscription? _presenceSubscription;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  static String _uidToKey(String uid) {
    return uid.replaceAll(RegExp(r'[.#$\[\]]'), '_');
  }

  // ─── User Registration & Lookup ──────────────────────────────────────────

  /// Register current user in RTDB for discovery
  static Future<void> registerUser(User user) async {
    final key = _uidToKey(user.uid);
    await _rtdb.ref('users/$key').set({
      'uid': user.uid,
      'email': user.email,
      'displayName': user.displayName ?? user.email?.split('@')[0] ?? 'User',
      'photoURL': user.photoURL ?? '',
      'lastSeen': ServerValue.timestamp,
    });
  }

  /// Lookup user by email in RTDB
  static Future<JchattUser?> lookupUserByEmail(String email) async {
    try {
      final snap = await _rtdb.ref('users')
          .orderByChild('email')
          .equalTo(email)
          .get();
      if (!snap.exists) return null;
      final data = snap.value as Map;
      final entry = data.values.first as Map;
      return JchattUser.fromMap(Map<String, dynamic>.from(entry));
    } catch (e) {
      return null;
    }
  }

  /// Lookup user by UID in RTDB
  static Future<JchattUser?> lookupUserByUid(String uid) async {
    try {
      final key = _uidToKey(uid);
      final snap = await _rtdb.ref('users/$key').get();
      if (!snap.exists) return null;
      return JchattUser.fromMap(Map<String, dynamic>.from(snap.value as Map));
    } catch (e) {
      return null;
    }
  }

  // ─── Presence ─────────────────────────────────────────────────────────────

  /// Setup presence heartbeat
  static void setupPresence(String uid) {
    final key = _uidToKey(uid);
    final presenceRef = _rtdb.ref('users/$key/lastSeen');
    presenceRef.set(ServerValue.timestamp);
    presenceRef.onDisconnect().set(ServerValue.timestamp);

    // Heartbeat every 60 seconds
    Timer.periodic(const Duration(seconds: 60), (_) {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        presenceRef.set(ServerValue.timestamp);
      }
    });
  }

  /// Subscribe to another user's presence
  static StreamSubscription subscribeToPresence(String uid, Function(int?) callback) {
    final key = _uidToKey(uid);
    final presenceRef = _rtdb.ref('users/$key/lastSeen');
    return presenceRef.onValue.listen((event) {
      callback(event.snapshot.value as int?);
    });
  }

  // ─── Read Receipts via RTDB ───────────────────────────────────────────────

  /// Write a receipt to RTDB
  static Future<void> writeReceipt(String chatId, String messageId, String status) async {
    try {
      await _rtdb.ref('receipts/$chatId/$messageId').set({
        'status': status,
        'by': FirebaseAuth.instance.currentUser?.uid ?? '',
        'at': ServerValue.timestamp,
      });
    } catch (e) {
      // Non-critical, silently fail
    }
  }

  /// Subscribe to all receipts for a chat
  static StreamSubscription subscribeToReceipts(
      String chatId, Function(Map<String, dynamic>) callback) {
    final receiptsRef = _rtdb.ref('receipts/$chatId');
    final sub = receiptsRef.onValue.listen((event) {
      if (!event.snapshot.exists) return;
      final data = Map<String, dynamic>.from(event.snapshot.value as Map);
      callback(data);
    });
    _receiptSubscriptions[chatId] = sub;
    return sub;
  }

  /// Mark all messages in a chat as read
  static Future<void> markChatAsRead(String chatId, List<Message> messages) async {
    final myUid = FirebaseAuth.instance.currentUser?.uid;
    if (myUid == null) return;

    final updates = <String, dynamic>{};
    for (final msg in messages) {
      if (msg.senderId != myUid && msg.status != 'read') {
        updates['receipts/$chatId/${msg.id}'] = {
          'status': 'read',
          'by': myUid,
          'at': ServerValue.timestamp,
        };
      }
    }

    if (updates.isNotEmpty) {
      try {
        await _rtdb.ref().update(updates);
      } catch (e) {
        // Non-critical
      }
    }

    // Also update local DB
    for (final msg in messages) {
      if (msg.senderId != myUid && msg.status != 'read') {
        await DatabaseService.updateMessageStatus(chatId, msg.id, 'read');
      }
    }
  }

  // ─── Typing Indicators ────────────────────────────────────────────────────

  static Timer? _typingTimer;

  /// Signal typing status
  static void setTyping(String chatId, bool isTyping) {
    final myUid = FirebaseAuth.instance.currentUser?.uid;
    if (myUid == null) return;

    final key = _uidToKey(myUid);
    final typingRef = _rtdb.ref('typing/$chatId/$key');

    if (isTyping) {
      typingRef.set({'uid': myUid, 'at': ServerValue.timestamp});
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 3), () {
        typingRef.remove();
      });
    } else {
      typingRef.remove();
      _typingTimer?.cancel();
    }
  }

  /// Subscribe to typing events in a chat
  static StreamSubscription subscribeToTyping(
      String chatId, Function(List<Map<String, dynamic>>) callback) {
    final typingRef = _rtdb.ref('typing/$chatId');
    final sub = typingRef.onValue.listen((event) {
      if (!event.snapshot.exists) {
        callback([]);
        return;
      }
      final data = Map<String, dynamic>.from(event.snapshot.value as Map);
      final myUid = FirebaseAuth.instance.currentUser?.uid;
      final now = DateTime.now().millisecondsSinceEpoch;
      final typingUsers = data.values
          .map((v) => Map<String, dynamic>.from(v as Map))
          .where((t) => t['uid'] != myUid && (now - (t['at'] as int? ?? 0)) < 5000)
          .toList();
      callback(typingUsers);
    });
    _typingSubscriptions[chatId] = sub;
    return sub;
  }

  // ─── Message Sending ─────────────────────────────────────────────────────

  /// Send a message via RTDB pending queue
  static Future<String> sendMessage(String chatId, String toUid, String text, {String? replyTo}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw Exception('Not authenticated');

    final msgId = _uuid.v4();
    final timestamp = DateTime.now().millisecondsSinceEpoch;

    final payload = {
      'type': 'message',
      'id': msgId,
      'chatId': chatId,
      'senderId': user.uid,
      'senderEmail': user.email,
      'senderName': user.displayName ?? user.email?.split('@')[0] ?? 'User',
      'senderPhoto': user.photoURL ?? '',
      'text': text,
      'timestamp': timestamp,
      'replyTo': replyTo,
    };

    // 1. Save locally (optimistic — instant)
    await DatabaseService.saveMessage(Message(
      id: msgId,
      chatId: chatId,
      senderId: user.uid,
      text: text,
      status: 'sent',
      timestamp: timestamp,
      replyTo: replyTo,
    ));

    // 2. Queue in RTDB for recipient
    final key = _uidToKey(toUid);
    await _rtdb.ref('pending/$key').push().set(payload);

    // Emit local event
    _messageController.add(chatId);

    return msgId;
  }

  // ─── Pending Message Listener ─────────────────────────────────────────────

  /// Listen for incoming messages via RTDB pending queue
  static void listenForPendingMessages(String myUid) {
    final key = _uidToKey(myUid);
    final pendingRef = _rtdb.ref('pending/$key');

    _pendingSubscription?.cancel();
    _pendingSubscription = pendingRef.onValue.listen((event) async {
      if (!event.snapshot.exists) return;

      final pending = Map<String, dynamic>.from(event.snapshot.value as Map);
      for (final entry in pending.entries) {
        final msg = Map<String, dynamic>.from(entry.value as Map);
        await _handleIncomingMessage(msg);
      }

      // Clear after processing
      await pendingRef.remove();
    });
  }

  /// Process an incoming message
  static Future<void> _handleIncomingMessage(Map<String, dynamic> msg) async {
    // Save to local DB
    await DatabaseService.saveMessage(Message(
      id: msg['id'] ?? '',
      chatId: msg['chatId'] ?? '',
      senderId: msg['senderId'] ?? '',
      text: msg['text'] ?? '',
      status: 'delivered',
      timestamp: msg['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      replyTo: msg['replyTo'],
    ));

    // Upsert sender info
    if (msg['senderName'] != null) {
      await DatabaseService.upsertUser(JchattUser(
        uid: msg['senderId'] ?? '',
        email: msg['senderEmail'] ?? '',
        displayName: msg['senderName'] ?? '',
        photoURL: msg['senderPhoto'] ?? '',
      ));
    }

    // Ensure chat exists locally
    final myUid = FirebaseAuth.instance.currentUser?.uid;
    if (myUid != null) {
      await DatabaseService.findOrCreateChat(myUid, msg['senderId']);
    }

    // Write "delivered" receipt to RTDB
    await writeReceipt(msg['chatId'], msg['id'], 'delivered');

    // Emit events
    _messageController.add(msg['chatId']);
    _notificationController.add(msg);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  static void dispose() {
    _pendingSubscription?.cancel();
    _presenceSubscription?.cancel();
    for (final sub in _receiptSubscriptions.values) {
      sub.cancel();
    }
    for (final sub in _typingSubscriptions.values) {
      sub.cancel();
    }
    _receiptSubscriptions.clear();
    _typingSubscriptions.clear();
  }
}
