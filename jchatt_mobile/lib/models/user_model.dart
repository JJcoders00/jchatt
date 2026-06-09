/// User model for local SQLite storage and RTDB
class JchattUser {
  final String uid;
  final String email;
  final String displayName;
  final String photoURL;

  JchattUser({
    required this.uid,
    required this.email,
    required this.displayName,
    this.photoURL = '',
  });

  Map<String, dynamic> toMap() => {
    'uid': uid,
    'email': email,
    'displayName': displayName,
    'photoURL': photoURL,
  };

  factory JchattUser.fromMap(Map<String, dynamic> map) => JchattUser(
    uid: map['uid'] ?? '',
    email: map['email'] ?? '',
    displayName: map['displayName'] ?? map['email']?.toString().split('@')[0] ?? 'Unknown',
    photoURL: map['photoURL'] ?? '',
  );

  String get avatarUrl => photoURL.isNotEmpty
      ? photoURL
      : 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(displayName)}&background=random';

  @override
  String toString() => 'JchattUser(uid: $uid, email: $email, displayName: $displayName)';
}
