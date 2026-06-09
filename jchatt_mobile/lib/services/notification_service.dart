import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Notification service for local + FCM push notifications
class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotif =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    // Android notification channel
    const androidChannel = AndroidNotificationChannel(
      'jchatt_messages',
      'Jchatt Messages',
      description: 'Notifications for new Jchatt messages',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // Create the channel
    await _localNotif
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // Initialize local notifications
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);
    await _localNotif.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
      },
    );

    // Request Firebase Messaging permission
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    _initialized = true;
  }

  /// Show a local notification for incoming message
  static Future<void> showMessageNotification({
    required String senderName,
    required String messageText,
    String? senderPhoto,
  }) async {
    final body = messageText.startsWith('data:image') 
        ? '📷 Photo' 
        : messageText.length > 100 
            ? '${messageText.substring(0, 100)}...' 
            : messageText;

    const androidDetails = AndroidNotificationDetails(
      'jchatt_messages',
      'Jchatt Messages',
      channelDescription: 'Notifications for new Jchatt messages',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      icon: '@mipmap/ic_launcher',
      styleInformation: BigTextStyleInformation(''),
    );

    const details = NotificationDetails(android: androidDetails);

    await _localNotif.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      '$senderName — Jchatt',
      body,
      details,
    );
  /// Show a notification from an FCM message
  static Future<void> showFcmNotification(RemoteMessage message) async {
    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      await showMessageNotification(
        senderName: notification.title ?? 'New Message',
        messageText: notification.body ?? '',
      );
    } else if (data.isNotEmpty) {
      await showMessageNotification(
        senderName: data['senderName'] ?? 'New Message',
        messageText: data['text'] ?? '',
      );
    }
  }
}
