package com.jjcoders.jchatt;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

        // 3. Native Hardware Back Button Handler (WhatsApp Standard Behavior)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleNativeBackAction();
            }
        });

        // 4. Add direct JavaScript Interface for reliable sync UID handshake and account persistence
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
                            if (token != null) ed.putString("sync_token", token.trim());
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

        // 5. Start Native Background Sync Service only if user is authenticated
        SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
        String savedUid = prefs.getString("sync_uid", null);
        if (savedUid != null && !savedUid.trim().isEmpty()) {
            startSyncService();
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

    @CapacitorPlugin(name = "BiometricAuth")
    public static class BiometricAuthPlugin extends Plugin {
        @PluginMethod
        public void setSyncUser(PluginCall call) {
            String uid = call.getString("uid");
            if (uid != null && !uid.trim().isEmpty()) {
                SharedPreferences prefs = getContext().getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                prefs.edit().putString("sync_uid", uid.trim()).apply();

                Intent serviceIntent = new Intent(getContext(), JChattSyncService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(getContext(), serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }
            }
            call.resolve();
        }

        @PluginMethod
        public void isAvailable(PluginCall call) {
            try {
                BiometricManager biometricManager = BiometricManager.from(getContext());
                int canAuth = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                );
                JSObject ret = new JSObject();
                ret.put("available", canAuth == BiometricManager.BIOMETRIC_SUCCESS);
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("available", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        }

        @PluginMethod
        public void authenticate(PluginCall call) {
            String title = call.getString("title", "Unlock JChatt");
            String subtitle = call.getString("subtitle", "Touch fingerprint sensor or face recognition");

            getActivity().runOnUiThread(() -> {
                try {
                    Executor executor = ContextCompat.getMainExecutor(getContext());
                    BiometricPrompt biometricPrompt = new BiometricPrompt(
                        (FragmentActivity) getActivity(),
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                JSObject ret = new JSObject();
                                ret.put("success", false);
                                ret.put("error", errString.toString());
                                ret.put("code", errorCode);
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
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        )
                        .build();

                    biometricPrompt.authenticate(promptInfo);
                } catch (Exception e) {
                    call.reject(e.getMessage());
                }
            });
        }
    }
}
