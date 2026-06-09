/// Message model for local SQLite storage
class Message {
  int? localId;
  final String id;
  final String chatId;
  final String senderId;
  final String text;
  String status; // 'sent', 'delivered', 'read'
  final int timestamp;
  final String? replyTo;

  Message({
    this.localId,
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.text,
    this.status = 'sent',
    required this.timestamp,
    this.replyTo,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'chatId': chatId,
    'senderId': senderId,
    'text': text,
    'status': status,
    'timestamp': timestamp,
    'replyTo': replyTo,
  };

  factory Message.fromMap(Map<String, dynamic> map) => Message(
    localId: map['localId'] as int?,
    id: map['id'] ?? '',
    chatId: map['chatId'] ?? '',
    senderId: map['senderId'] ?? '',
    text: map['text'] ?? '',
    status: map['status'] ?? 'sent',
    timestamp: map['timestamp'] ?? 0,
    replyTo: map['replyTo'],
  );

  DateTime get timestampDate => DateTime.fromMillisecondsSinceEpoch(timestamp);

  bool get isImage => text.startsWith('data:image');

  @override
  String toString() => 'Message(id: $id, chatId: $chatId, text: ${text.substring(0, text.length > 30 ? 30 : text.length)})';
}
