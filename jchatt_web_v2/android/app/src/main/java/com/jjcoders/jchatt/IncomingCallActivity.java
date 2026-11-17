package com.jjcoders.jchatt;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class IncomingCallActivity extends Activity {
    private Ringtone ringtone;
    private Vibrator vibrator;
    private String callId;
    private String callerUid;
    private String myUid;
    private boolean isVideo = false;
    private volatile boolean isDestroyed = false;
    private Handler timeoutHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Telegram / WhatsApp Full Lock-Screen Wakeup Protocol
        Window win = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            win.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        win.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_incoming_call);

        // 2. Extract Call Parameters
        Intent intent = getIntent();
        callId = intent.getStringExtra("callId");
        callerUid = intent.getStringExtra("callerUid");
        String callerName = intent.getStringExtra("callerName");
        String callerHandle = intent.getStringExtra("callerHandle");
        isVideo = intent.getBooleanExtra("video", false);

        SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
        myUid = prefs.getString("sync_uid", "");

        TextView tvName = findViewById(R.id.tv_caller_name);
        TextView tvHandle = findViewById(R.id.tv_caller_handle);
        TextView tvCallType = findViewById(R.id.tv_call_type);

        if (callerName != null && !callerName.isEmpty()) tvName.setText(callerName);
        if (callerHandle != null && !callerHandle.isEmpty()) {
            tvHandle.setText(callerHandle.startsWith("@") ? callerHandle : "@" + callerHandle);
        }
        tvCallType.setText(isVideo ? "Incoming End-to-End Encrypted Video Call" : "Incoming End-to-End Encrypted Voice Call");

        // 3. Audio & Haptic Ringing Protocol
        startRinging();

        // 4. Decline Action
        ImageButton btnDecline = findViewById(R.id.btn_decline_call);
        btnDecline.setOnClickListener(v -> declineCall());

        // 5. Answer Action
        ImageButton btnAnswer = findViewById(R.id.btn_answer_call);
        btnAnswer.setOnClickListener(v -> answerCall());

        // 6. Monitor Call Status (Detect Remote Cancel / Hangup)
        startCallRemoteWatcher();

        // 7. Auto-timeout after 50 seconds if unanswered
        timeoutHandler.postDelayed(() -> {
            if (!isDestroyed) {
                stopRinging();
                finish();
            }
        }, 50000);
    }

    private void startRinging() {
        try {
            Uri ringUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), ringUri);
            if (ringtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ringtone.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                }
                ringtone.play();
            }
        } catch (Exception ignored) {}

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                long[] pattern = new long[]{0, 1000, 1000, 1000, 1000};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopRinging() {
        try {
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
            }
        } catch (Exception ignored) {}

        try {
            if (vibrator != null) {
                vibrator.cancel();
            }
        } catch (Exception ignored) {}

        // Dismiss call notification
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(JChattSyncService.SYNC_CALL_NOTIF_ID);
            }
        } catch (Exception ignored) {}
    }

    private void declineCall() {
        if (isDestroyed) return;
        isDestroyed = true;
        stopRinging();

        new Thread(() -> {
            try {
                if (myUid != null && !myUid.isEmpty() && callId != null && !callId.isEmpty()) {
                    String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/calls/" + myUid + "/" + callId + "/status.json";
                    URL url = new URL(urlStr);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PUT");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(5000);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write("\"declined\"".getBytes(StandardCharsets.UTF_8));
                    }
                    conn.getResponseCode();
                    conn.disconnect();
                }
            } catch (Exception ignored) {}
        }).start();

        finish();
    }

    private void answerCall() {
        if (isDestroyed) return;
        isDestroyed = true;
        stopRinging();

        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setAction("ACTION_ANSWER_CALL");
        mainIntent.putExtra("callId", callId);
        mainIntent.putExtra("callerUid", callerUid);
        mainIntent.putExtra("video", isVideo);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(mainIntent);
        finish();
    }

    private void startCallRemoteWatcher() {
        new Thread(() -> {
            while (!isDestroyed) {
                try {
                    Thread.sleep(2500);
                    if (isDestroyed || myUid == null || myUid.isEmpty() || callId == null) break;

                    String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/calls/" + myUid + "/" + callId + ".json";
                    URL url = new URL(urlStr);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(4000);
                    conn.setReadTimeout(4000);

                    int code = conn.getResponseCode();
                    if (code == 200) {
                        BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = r.readLine()) != null) sb.append(line);
                        r.close();
                        conn.disconnect();

                        String res = sb.toString().trim();
                        if (res.equals("null") || res.isEmpty()) {
                            // Call was cancelled or deleted
                            runOnUiThread(() -> {
                                stopRinging();
                                finish();
                            });
                            break;
                        }

                        JSONObject obj = new JSONObject(res);
                        String status = obj.optString("status", "");
                        if ("ended".equals(status) || "declined".equals(status) || "cancelled".equals(status)) {
                            runOnUiThread(() -> {
                                stopRinging();
                                finish();
                            });
                            break;
                        }
                    } else {
                        conn.disconnect();
                    }
                } catch (Exception ignored) {}
            }
        }).start();
    }

    @Override
    protected void onDestroy() {
        isDestroyed = true;
        stopRinging();
        timeoutHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
