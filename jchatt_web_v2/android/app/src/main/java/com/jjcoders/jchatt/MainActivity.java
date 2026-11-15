package com.jjcoders.jchatt;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_NOTIFICATIONS = 1001;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricAuthPlugin.class);
        super.onCreate(savedInstanceState);

        // 1. WhatsApp Luxury Native Status & Nav Bar Theming
        try {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0b141a"));
            window.setNavigationBarColor(Color.parseColor("#0b141a"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = window.getDecorView();
                decor.setSystemUiVisibility(decor.getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            }
        } catch (Exception ignored) {}

        // 2. Persistent Wake Lock for CPU Background Keepalive
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JChatt::BackgroundSync");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}

        // 3. Android 13+ (API 33+) Runtime POST_NOTIFICATIONS Permission (WhatsApp & Telegram Standard)
        requestNotificationPermissionIfNeeded();

        // 4. Native Hardware Back Button Handler (WhatsApp Standard Behavior)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleNativeBackAction();
            }
        });

        // 5. Add direct JavaScript Interface for reliable sync UID handshake and account persistence
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public void setSyncUser(String uid) {
                        setSyncUserWithToken(uid, "");
                    }
                    @android.webkit.JavascriptInterface
                    public void setSyncUser(String uid, String token) {
                        setSyncUserWithToken(uid, token);
                    }
                    private void setSyncUserWithToken(String uid, String token) {
                        if (uid != null && !uid.trim().isEmpty()) {
                            SharedPreferences p = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                            SharedPreferences.Editor ed = p.edit().putString("sync_uid", uid.trim());
                            if (token != null && !token.trim().isEmpty()) {
                                ed.putString("sync_token", token.trim());
                            }
                            ed.apply();
                            startSyncService();
                        }
                    }
                    @android.webkit.JavascriptInterface
                    public void clearSyncUser() {
                        SharedPreferences p = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                        p.edit().remove("sync_uid").remove("sync_token").apply();
                    }
                    @android.webkit.JavascriptInterface
                    public void setSavedAccount(String json) {
                        if (json != null && !json.trim().isEmpty()) {
                            SharedPreferences p = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                            p.edit().putString("saved_account_json", json.trim()).apply();
                        }
                    }
                    @android.webkit.JavascriptInterface
                    public String getSavedAccount() {
                        SharedPreferences p = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                        return p.getString("saved_account_json", null);
                    }
                    @android.webkit.JavascriptInterface
                    public void clearSavedAccount() {
                        SharedPreferences p = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                        p.edit().remove("saved_account_json").apply();
                    }
                }, "AndroidSync");
            }
        } catch (Exception ignored) {}

        // 6. Start Native Background Sync Service if user is authenticated
        SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
        String savedUid = prefs.getString("sync_uid", null);
        if (savedUid != null && !savedUid.trim().isEmpty()) {
            startSyncService();
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    PERMISSION_REQ_NOTIFICATIONS
                );
            }
        }
    }

    private void handleNativeBackAction() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "(function() { try { if (window.handleNativeBack) { return window.handleNativeBack() ? 'true' : 'false'; } } catch(e){} return 'false'; })()",
                value -> {
                    if (value == null || "false".equals(value) || "\"false\"".equals(value)) {
                        moveTaskToBack(true);
                    }
                }
            );
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    public void onBackPressed() {
        handleNativeBackAction();
    }

    public void startSyncService() {
        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String uid = prefs.getString("sync_uid", null);
            if (uid == null || uid.trim().isEmpty()) {
                return; // Do not start foreground sync without an authenticated user
            }
            Intent serviceIntent = new Intent(this, JChattSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().resumeTimers();
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(30 * 60 * 1000L);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @CapacitorPlugin(name = "BiometricAuth")
    public static class BiometricAuthPlugin extends Plugin {

        @PluginMethod
        public void setSyncUser(PluginCall call) {
            String uid = call.getString("uid");
            String token = call.getString("token", "");
            if (uid != null && !uid.trim().isEmpty()) {
                Context ctx = getContext();
                SharedPreferences prefs = ctx.getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor ed = prefs.edit().putString("sync_uid", uid.trim());
                if (token != null && !token.trim().isEmpty()) {
                    ed.putString("sync_token", token.trim());
                }
                ed.apply();

                Intent serviceIntent = new Intent(ctx, JChattSyncService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(ctx, serviceIntent);
                } else {
                    ctx.startService(serviceIntent);
                }
            }
            call.resolve();
        }

        @PluginMethod
        public void clearSyncUser(PluginCall call) {
            Context ctx = getContext();
            SharedPreferences prefs = ctx.getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            prefs.edit().remove("sync_uid").remove("sync_token").apply();
            call.resolve();
        }

        @PluginMethod
        public void checkAvailability(PluginCall call) {
            JSObject ret = new JSObject();
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int canAuthenticate = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG |
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );

            if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
                ret.put("available", true);
                ret.put("biometryType", "biometrics");
            } else {
                ret.put("available", false);
                ret.put("biometryType", "none");
            }
            call.resolve(ret);
        }

        @PluginMethod
        public void authenticate(PluginCall call) {
            String title = call.getString("reason", "Unlock JChatt Secure Vault");
            getActivity().runOnUiThread(() -> {
                Executor executor = ContextCompat.getMainExecutor(getContext());
                BiometricPrompt biometricPrompt = new BiometricPrompt(
                    (FragmentActivity) getActivity(),
                    executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("error", errString.toString());
                            call.resolve(ret);
                        }

                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            call.resolve(ret);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                        }
                    }
                );

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle("Confirm fingerprint or device PIN")
                    .setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG |
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    .build();

                biometricPrompt.authenticate(promptInfo);
            });
        }
    }
}
