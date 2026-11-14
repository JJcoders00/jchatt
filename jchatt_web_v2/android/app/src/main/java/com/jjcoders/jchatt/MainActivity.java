package com.jjcoders.jchatt;

import android.content.Context;
import android.os.Bundle;
import android.os.PowerManager;
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

import java.util.concurrent.Executor;

public class MainActivity extends BridgeActivity {
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricAuthPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JChatt::BackgroundSync");
                wakeLock.setReferenceCounted(false);
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
                wakeLock.acquire(10 * 60 * 1000L); // 10 minutes wake lock per background cycle
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
