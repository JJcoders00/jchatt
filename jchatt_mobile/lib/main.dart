import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/notification_service.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/home_screen.dart';
import 'screens/chat_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Initialize Notification Service
  await NotificationService.initialize();
  
  // Register background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Immersive status bar
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0f172a),
  ));

  runApp(const JchattApp());
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await NotificationService.initialize();
  NotificationService.showFcmNotification(message);
}

class JchattApp extends StatefulWidget {
  const JchattApp({super.key});

  static final GlobalKey<JchattAppState> appKey = GlobalKey<JchattAppState>();

  @override
  State<JchattApp> createState() => JchattAppState();
}

class JchattAppState extends State<JchattApp> {
  ThemeMode _themeMode = ThemeMode.dark;
  Color _accentColor = const Color(0xFF6366f1);
  String _themeName = 'dark';

  @override
  void initState() {
    super.initState();
    _loadThemePrefs();
  }

  Future<void> _loadThemePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _themeName = prefs.getString('jchattTheme') ?? 'dark';
      final colorHex = prefs.getString('jchattColor') ?? '6366f1';
      _accentColor = Color(int.parse('FF$colorHex', radix: 16));
      _themeMode = _themeName == 'light' ? ThemeMode.light : ThemeMode.dark;
    });
  }

  void setTheme(String themeName, Color accentColor) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jchattTheme', themeName);
    await prefs.setString('jchattColor', 
      accentColor.value.toRadixString(16).substring(2));
    setState(() {
      _themeName = themeName;
      _accentColor = accentColor;
      _themeMode = themeName == 'light' ? ThemeMode.light : ThemeMode.dark;
    });
  }

  Color get accentColor => _accentColor;
  String get themeName => _themeName;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jchatt',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/home': (context) => const HomeScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/chat') {
          final args = settings.arguments as Map<String, dynamic>;
          return MaterialPageRoute(
            builder: (context) => ChatScreen(
              chatId: args['chatId'],
              otherUser: args['otherUser'],
            ),
          );
        }
        return null;
      },
    );
  }

  ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    // Colors based on theme name
    Color bgMain, bgPanel, bgChat, textPrimary, textSecondary, borderColor, 
          msgIn, msgInText;

    if (_themeName == 'midnight') {
      bgMain = const Color(0xFF050b14);
      bgPanel = const Color(0xFF0a1325);
      bgChat = const Color(0xFF070e1c);
      textPrimary = const Color(0xFFe2e8f0);
      textSecondary = const Color(0xFF64748b);
      borderColor = const Color(0x14FFFFFF);
      msgIn = const Color(0xFF112240);
      msgInText = const Color(0xFFf8fafc);
    } else if (!isDark) {
      bgMain = const Color(0xFFf1f5f9);
      bgPanel = const Color(0xFFffffff);
      bgChat = const Color(0xFFf8fafc);
      textPrimary = const Color(0xFF0f172a);
      textSecondary = const Color(0xFF64748b);
      borderColor = const Color(0x14000000);
      msgIn = const Color(0xFFffffff);
      msgInText = const Color(0xFF0f172a);
    } else {
      bgMain = const Color(0xFF0f172a);
      bgPanel = const Color(0xFF1e293b);
      bgChat = const Color(0xFF0f172a);
      textPrimary = const Color(0xFFf8fafc);
      textSecondary = const Color(0xFF94a3b8);
      borderColor = const Color(0x1AFFFFFF);
      msgIn = const Color(0xFF334155);
      msgInText = const Color(0xFFf8fafc);
    }

    return ThemeData(
      brightness: brightness,
      useMaterial3: true,
      fontFamily: 'Inter',
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: _accentColor,
        onPrimary: Colors.white,
        secondary: _accentColor,
        onSecondary: Colors.white,
        surface: bgPanel,
        onSurface: textPrimary,
        error: const Color(0xFFef4444),
        onError: Colors.white,
        surfaceContainerHighest: bgMain,
      ),
      scaffoldBackgroundColor: bgMain,
      appBarTheme: AppBarTheme(
        backgroundColor: bgPanel.withOpacity(0.9),
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w600,
          fontSize: 18,
          color: textPrimary,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgPanel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: borderColor),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgMain,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _accentColor, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: TextStyle(color: textSecondary),
        hintStyle: TextStyle(color: textSecondary.withOpacity(0.7)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _accentColor,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          side: BorderSide(color: borderColor),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: bgPanel,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: bgPanel,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
      extensions: [
        JchattColors(
          bgMain: bgMain,
          bgPanel: bgPanel,
          bgChat: bgChat,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          borderColor: borderColor,
          msgIn: msgIn,
          msgInText: msgInText,
          msgOut: _accentColor,
          accent: _accentColor,
        ),
      ],
    );
  }
}

/// Custom theme extension for Jchatt-specific colors
class JchattColors extends ThemeExtension<JchattColors> {
  final Color bgMain;
  final Color bgPanel;
  final Color bgChat;
  final Color textPrimary;
  final Color textSecondary;
  final Color borderColor;
  final Color msgIn;
  final Color msgInText;
  final Color msgOut;
  final Color accent;

  JchattColors({
    required this.bgMain,
    required this.bgPanel,
    required this.bgChat,
    required this.textPrimary,
    required this.textSecondary,
    required this.borderColor,
    required this.msgIn,
    required this.msgInText,
    required this.msgOut,
    required this.accent,
  });

  @override
  ThemeExtension<JchattColors> copyWith({
    Color? bgMain, Color? bgPanel, Color? bgChat,
    Color? textPrimary, Color? textSecondary, Color? borderColor,
    Color? msgIn, Color? msgInText, Color? msgOut, Color? accent,
  }) {
    return JchattColors(
      bgMain: bgMain ?? this.bgMain,
      bgPanel: bgPanel ?? this.bgPanel,
      bgChat: bgChat ?? this.bgChat,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      borderColor: borderColor ?? this.borderColor,
      msgIn: msgIn ?? this.msgIn,
      msgInText: msgInText ?? this.msgInText,
      msgOut: msgOut ?? this.msgOut,
      accent: accent ?? this.accent,
    );
  }

  @override
  ThemeExtension<JchattColors> lerp(ThemeExtension<JchattColors>? other, double t) {
    if (other is! JchattColors) return this;
    return JchattColors(
      bgMain: Color.lerp(bgMain, other.bgMain, t)!,
      bgPanel: Color.lerp(bgPanel, other.bgPanel, t)!,
      bgChat: Color.lerp(bgChat, other.bgChat, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      borderColor: Color.lerp(borderColor, other.borderColor, t)!,
      msgIn: Color.lerp(msgIn, other.msgIn, t)!,
      msgInText: Color.lerp(msgInText, other.msgInText, t)!,
      msgOut: Color.lerp(msgOut, other.msgOut, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
    );
  }
}
