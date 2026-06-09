import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../main.dart';
import '../services/auth_service.dart';
import '../services/database_service.dart';
import '../models/user_model.dart';

/// Login screen with email/password + Google Sign-In
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  String? _error;
  bool _isLoading = false;
  bool _isGoogleLoading = false;
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _error = null; });

    try {
      final cred = await _authService.loginWithEmail(
        _emailController.text.trim(),
        _passwordController.text,
      );
      await _saveUser(cred.user!);
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } on FirebaseException catch (e) {
      setState(() { _error = AuthService.formatError(e.code); });
    } catch (e) {
      setState(() { _error = 'Something went wrong. Please try again.'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  Future<void> _handleGoogleLogin() async {
    setState(() { _isGoogleLoading = true; _error = null; });

    try {
      final result = await _authService.signInWithGoogle();
      await _saveUser(result.user!);
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      setState(() {
        _error = e.toString().contains('cancelled')
            ? 'Sign-in was cancelled.'
            : 'Google sign-in failed. Please try again.';
      });
    } finally {
      if (mounted) setState(() { _isGoogleLoading = false; });
    }
  }

  Future<void> _saveUser(User user) async {
    try {
      await DatabaseService.upsertUser(JchattUser(
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
        photoURL: user.photoURL ?? '',
      ));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<JchattColors>()!;

    return Scaffold(
      backgroundColor: colors.bgMain,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 420),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: colors.bgPanel,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: colors.borderColor),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset('assets/icon.png',
                            width: 64, height: 64),
                      ),
                      const SizedBox(height: 16),

                      Text(
                        'Welcome to Jchatt',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w600,
                          color: colors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Email Field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          hintText: 'Enter your email',
                        ),
                        validator: (v) => v!.isEmpty ? 'Email is required' : null,
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          hintText: 'Enter your password',
                        ),
                        validator: (v) => v!.isEmpty ? 'Password is required' : null,
                      ),

                      // Error
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!,
                            style: const TextStyle(
                                color: Color(0xFFef4444), fontSize: 14)),
                      ],

                      const SizedBox(height: 20),

                      // Login Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Login'),
                        ),
                      ),

                      // Divider
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        child: Text('OR',
                            style: TextStyle(
                                color: colors.textSecondary, fontSize: 14)),
                      ),

                      // Google Button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isGoogleLoading ? null : _handleGoogleLogin,
                          icon: Image.network(
                            'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                            width: 22,
                            height: 22,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.g_mobiledata, size: 22),
                          ),
                          label: _isGoogleLoading
                              ? SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: colors.textPrimary,
                                  ),
                                )
                              : const Text('Continue with Google'),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Signup link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text("Don't have an account? ",
                              style: TextStyle(
                                  color: colors.textSecondary, fontSize: 14)),
                          GestureDetector(
                            onTap: () => Navigator.pushReplacementNamed(
                                context, '/signup'),
                            child: Text('Sign up',
                                style: TextStyle(
                                  color: colors.accent,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                )),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
