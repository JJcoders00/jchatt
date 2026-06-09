import 'user_model.dart';

/// Chat model for local SQLite storage
class Chat {
  final String id;
  final List<String> memberUids;
  String lastMessage;
  int lastTimestamp;
  int unreadCount;
  JchattUser? otherUser;

  Chat({
    required this.id,
    required this.memberUids,
    this.lastMessage = '',
    this.lastTimestamp = 0,
    this.unreadCount = 0,
    this.otherUser,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'memberUids': memberUids.join(','),
    'lastMessage': lastMessage,
    'lastTimestamp': lastTimestamp,
  };

  factory Chat.fromMap(Map<String, dynamic> map) => Chat(
    id: map['id'] ?? '',
    memberUids: (map['memberUids'] as String?)?.split(',') ?? [],
    lastMessage: map['lastMessage'] ?? '',
    lastTimestamp: map['lastTimestamp'] ?? 0,
  );

  /// Build deterministic chat ID from two UIDs
  static String buildChatId(String uid1, String uid2) {
    final sorted = [uid1, uid2]..sort();
    return sorted.join('__');
  }

  DateTime get lastTimestampDate => DateTime.fromMillisecondsSinceEpoch(lastTimestamp);
}
