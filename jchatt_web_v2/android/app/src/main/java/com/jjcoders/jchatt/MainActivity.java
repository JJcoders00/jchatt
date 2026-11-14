package com.jjcoders.jchatt;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
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

import java.util.ArrayList;
import java.util.concurrent.Executor;

import io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService;

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

        // 3. Native Background Service Auto-Start (Guarantees 24/7 background calls and messages)
        startNativeForegroundSync();
    }

    public void startNativeForegroundSync() {
        try {
            Context context = getApplicationContext();
            String channelId = "jchatt_sync_channel";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "JChatt Background Service",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Keeps secure calls and messages connected in background");
                channel.setShowBadge(false);
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.createNotificationChannel(channel);
                }
            }

            Intent serviceIntent = new Intent(context, AndroidForegroundService.class);
            Bundle notifBundle = new Bundle();
            notifBundle.putString("title", "JChatt Sovereign Messenger");
            notifBundle.putString("body", "Connected for secure calls & messages");
            notifBundle.putInt("id", 7771);
            notifBundle.putInt("icon", R.drawable.ic_launcher);
            notifBundle.putBoolean("silent", true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                notifBundle.putInt("serviceType", ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                notifBundle.putInt("serviceType", 0);
            }
            notifBundle.putParcelableArrayList("buttons", new ArrayList<Bundle>());

            serviceIntent.putExtra("notification", notifBundle);
            serviceIntent.putExtra("channelId", channelId);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep JavaScript timers and WebSockets alive in background!
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().resumeTimers();
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(30 * 60 * 1000L); // 30 minutes wake lock per background cycle
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
