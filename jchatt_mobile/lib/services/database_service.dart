import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../models/user_model.dart';
import '../models/chat_model.dart';
import '../models/message_model.dart';

/// Local SQLite database — replaces IndexedDB (Dexie.js) from the web version.
class DatabaseService {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  static Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'jchatt.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE users (
            uid TEXT PRIMARY KEY,
            email TEXT,
            displayName TEXT,
            photoURL TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE chats (
            id TEXT PRIMARY KEY,
            memberUids TEXT,
            lastMessage TEXT,
            lastTimestamp INTEGER
          )
        ''');
        await db.execute('''
          CREATE TABLE messages (
            localId INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT UNIQUE,
            chatId TEXT,
            senderId TEXT,
            text TEXT,
            status TEXT DEFAULT 'sent',
            timestamp INTEGER,
            replyTo TEXT
          )
        ''');
        await db.execute('CREATE INDEX idx_messages_chatId ON messages(chatId)');
        await db.execute('CREATE INDEX idx_messages_timestamp ON messages(timestamp)');
        await db.execute('CREATE INDEX idx_users_email ON users(email)');
      },
    );
  }

  // ─── USER helpers ───────────────────────────────────────────────────────────

  static Future<void> upsertUser(JchattUser user) async {
    final db = await database;
    await db.insert('users', user.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<JchattUser?> getUserByEmail(String email) async {
    final db = await database;
    final maps = await db.query('users', where: 'email = ?', whereArgs: [email]);
    if (maps.isEmpty) return null;
    return JchattUser.fromMap(maps.first);
  }

  static Future<JchattUser?> getUserByUid(String uid) async {
    final db = await database;
    final maps = await db.query('users', where: 'uid = ?', whereArgs: [uid]);
    if (maps.isEmpty) return null;
    return JchattUser.fromMap(maps.first);
  }

  // ─── CHAT helpers ───────────────────────────────────────────────────────────

  static Future<void> upsertChat(Chat chat) async {
    final db = await database;
    await db.insert('chats', chat.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Chat>> getChatsForUser(String uid) async {
    final db = await database;
    final maps = await db.query('chats',
        where: 'memberUids LIKE ?',
        whereArgs: ['%$uid%'],
        orderBy: 'lastTimestamp DESC');
    return maps.map((m) => Chat.fromMap(m)).toList();
  }

  static Future<Chat?> getChatById(String chatId) async {
    final db = await database;
    final maps = await db.query('chats', where: 'id = ?', whereArgs: [chatId]);
    if (maps.isEmpty) return null;
    return Chat.fromMap(maps.first);
  }

  static Future<Chat> findOrCreateChat(String myUid, String otherUid) async {
    final chatId = Chat.buildChatId(myUid, otherUid);
    final existing = await getChatById(chatId);
    if (existing != null) return existing;

    final chat = Chat(
      id: chatId,
      memberUids: [myUid, otherUid],
      lastMessage: '',
      lastTimestamp: DateTime.now().millisecondsSinceEpoch,
    );
    await upsertChat(chat);
    return chat;
  }

  // ─── MESSAGE helpers ────────────────────────────────────────────────────────

  static Future<int> saveMessage(Message msg) async {
    final db = await database;

    // Idempotent: check for duplicate via unique `id` field
    final existing = await db.query('messages',
        where: 'id = ?', whereArgs: [msg.id]);

    if (existing.isNotEmpty) {
      // Update status only (sent → delivered → read)
      await db.update('messages', {'status': msg.status},
          where: 'id = ?', whereArgs: [msg.id]);
      return existing.first['localId'] as int;
    }

    final localId = await db.insert('messages', msg.toMap());

    // Keep chat preview current
    final preview = msg.isImage ? '📷 Photo' : msg.text;
    await db.update(
      'chats',
      {'lastMessage': preview, 'lastTimestamp': msg.timestamp},
      where: 'id = ?',
      whereArgs: [msg.chatId],
    );

    return localId;
  }

  static Future<List<Message>> getMessagesForChat(String chatId) async {
    final db = await database;
    final maps = await db.query('messages',
        where: 'chatId = ?',
        whereArgs: [chatId],
        orderBy: 'timestamp ASC');
    return maps.map((m) => Message.fromMap(m)).toList();
  }

  static Future<void> updateMessageStatus(String chatId, String msgId, String status) async {
    final db = await database;
    await db.update('messages', {'status': status},
        where: 'chatId = ? AND id = ?',
        whereArgs: [chatId, msgId]);
  }

  static Future<void> deleteMessage(String chatId, String msgId) async {
    final db = await database;
    await db.delete('messages',
        where: 'chatId = ? AND id = ?',
        whereArgs: [chatId, msgId]);
  }

  static Future<int> getUnreadCount(String chatId, String myUid) async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM messages WHERE chatId = ? AND senderId != ? AND status != ?',
      [chatId, myUid, 'read'],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  /// Purge messages older than 30 days
  static Future<void> purgeOldMessages() async {
    final db = await database;
    final cutoff = DateTime.now()
        .subtract(const Duration(days: 30))
        .millisecondsSinceEpoch;
    await db.delete('messages',
        where: 'timestamp < ?', whereArgs: [cutoff]);
  }
}
