package com.jjcoders.jchatt;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

public class JChattSyncService extends Service {
    public static final String CHANNEL_SYNC_ID = "jchatt_sync_v6";
    public static final String CHANNEL_MESSAGES_ID = "jchatt_messages_v6";
    public static final int SYNC_NOTIF_ID = 7771;

    private PowerManager.WakeLock wakeLock;
    private volatile boolean isRunning = false;
    private Thread syncThread;
    private final Set<String> seenMessageIds = new HashSet<>();

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JChatt::NativeSyncLock");
                wakeLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startOngoingForeground();
        startBackgroundSyncWorker();
        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Silent keepalive sync channel (IMPORTANCE_MIN suppresses status bar icon completely)
            NotificationChannel syncChannel = new NotificationChannel(
                CHANNEL_SYNC_ID,
                "JChatt Background Service",
                NotificationManager.IMPORTANCE_MIN
            );
            syncChannel.setDescription("Maintains secure socket for incoming calls & messages");
            syncChannel.setShowBadge(false);
            syncChannel.setSound(null, null);
            syncChannel.enableVibration(false);
            syncChannel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            nm.createNotificationChannel(syncChannel);

            // 2. High-importance message notification channel with sound & vibration
            NotificationChannel msgChannel = new NotificationChannel(
                CHANNEL_MESSAGES_ID,
                "JChatt Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            msgChannel.setDescription("High priority encrypted message alerts");
            msgChannel.enableVibration(true);
            msgChannel.setVibrationPattern(new long[]{0, 280, 140, 280});
            msgChannel.setShowBadge(true);
            msgChannel.enableLights(true);
            msgChannel.setLightColor(Color.GREEN);
            msgChannel.setBypassDnd(true);
            msgChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build();
            msgChannel.setSound(defaultSound, audioAttributes);

            nm.createNotificationChannel(msgChannel);
        }
    }

    private void startOngoingForeground() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            this,
            0,
            launchIntent != null ? launchIntent : new Intent(this, MainActivity.class),
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_SYNC_ID)
            .setContentTitle("JChatt")
            .setContentText("Background service active")
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setShowWhen(false)
            .setLocalOnly(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(SYNC_NOTIF_ID, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(SYNC_NOTIF_ID, builder.build());
        }
    }

    private synchronized void startBackgroundSyncWorker() {
        if (isRunning && syncThread != null && syncThread.isAlive()) return;
        isRunning = true;

        syncThread = new Thread(() -> {
            while (isRunning) {
                try {
                    SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                    String uid = prefs.getString("sync_uid", null);
                    if (uid == null || uid.isEmpty()) {
                        Thread.sleep(3000);
                        continue;
                    }

                    runFirebaseSseStream(uid);
                } catch (InterruptedException ie) {
                    break;
                } catch (Exception e) {
                    try { Thread.sleep(5000); } catch (Exception ignored) {}
                }
            }
        });
        syncThread.setName("JChatt-Firebase-SSE-Worker");
        syncThread.start();
    }

    private void runFirebaseSseStream(String uid) {
        HttpURLConnection conn = null;
        BufferedReader reader = null;
        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String token = prefs.getString("sync_token", null);
            String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/userChats/" + uid + ".json";
            if (token != null && !token.trim().isEmpty()) {
                urlStr += "?auth=" + token.trim();
            }

            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setRequestProperty("User-Agent", "JChattNativeSync/2.0");
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(0); // Infinite read timeout for SSE stream
            conn.connect();

            int code = conn.getResponseCode();
            if (code != 200) {
                Thread.sleep(5000);
                return;
            }

            InputStream is = conn.getInputStream();
            reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));

            String line;
            String currentEvent = "message";
            boolean isInitialBatch = true;

            while (isRunning && (line = reader.readLine()) != null) {
                line = line.trim();
                if (line.startsWith("event:")) {
                    currentEvent = line.substring(6).trim();
                } else if (line.startsWith("data:")) {
                    String dataJson = line.substring(5).trim();
                    if (!"null".equals(dataJson) && !dataJson.isEmpty()) {
                        handleSseData(uid, currentEvent, dataJson, isInitialBatch);
                        isInitialBatch = false;
                    }
                }
            }
        } catch (Exception e) {
            // Reconnect on network drops
        } finally {
            try { if (reader != null) reader.close(); } catch (Exception ignored) {}
            try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
        }
    }

    private void handleSseData(String uid, String event, String jsonStr, boolean isInitial) {
        try {
            JSONObject root = new JSONObject(jsonStr);
            String path = root.optString("path", "");
            JSONObject data = root.optJSONObject("data");

            if (data == null && root.has("lastText")) {
                data = root;
            }

            if (data != null) {
                Iterator<String> keys = data.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    JSONObject chatObj = data.optJSONObject(key);
                    if (chatObj != null) {
                        processSingleChat(uid, key, chatObj, isInitial);
                    }
                }
                if (data.has("lastText") && data.has("lastMsgId")) {
                    String chatId = path.replace("/", "").trim();
                    processSingleChat(uid, chatId, data, isInitial);
                }
            }
        } catch (Exception ignored) {}
    }

    private void processSingleChat(String uid, String chatId, JSONObject chat, boolean isInitial) {
        try {
            String lastMsgId = chat.optString("lastMsgId", "");
            String lastFrom = chat.optString("lastFrom", "");
            String lastText = chat.optString("lastText", "New message");
            String senderName = chat.optString("name", chat.optString("handle", "JChatt Contact"));

            if (lastMsgId.isEmpty() || lastFrom.isEmpty()) return;

            // If message is from someone else:
            if (!lastFrom.equals(uid)) {
                // 1. Immediately mark message as DELIVERED in Firebase via quick HTTP PUT!
                markDeliveredInFirebase(chatId, lastMsgId, uid);

                // 2. If it's a new message and not the initial connection batch:
                if (!isInitial && !seenMessageIds.contains(lastMsgId)) {
                    seenMessageIds.add(lastMsgId);
                    showNativeMessageNotification(chatId, senderName, lastText);
                } else if (isInitial) {
                    seenMessageIds.add(lastMsgId);
                }
            }
        } catch (Exception ignored) {}
    }

    private void markDeliveredInFirebase(String chatId, String msgId, String uid) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                String token = prefs.getString("sync_token", null);
                String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/messages/" + chatId + "/" + msgId + "/deliveredTo/" + uid + ".json";
                if (token != null && !token.trim().isEmpty()) {
                    urlStr += "?auth=" + token.trim();
                }

                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write("true".getBytes(StandardCharsets.UTF_8));
                }
                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) {}
        }).start();
    }

    private void showNativeMessageNotification(String chatId, String sender, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (intent == null) intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("chatId", chatId);

            PendingIntent pi = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) : PendingIntent.FLAG_UPDATE_CURRENT
            );

            Notification publicVersion = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle(sender)
                .setContentText(text)
                .build();

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle(sender)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPublicVersion(publicVersion);

            nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        } catch (Exception ignored) {}
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        try {
            Intent restartService = new Intent(getApplicationContext(), JChattSyncService.class);
            restartService.setPackage(getPackageName());
            PendingIntent pi = PendingIntent.getService(
                getApplicationContext(),
                1001,
                restartService,
                PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = System.currentTimeMillis() + 1000;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception ignored) {}
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String uid = prefs.getString("sync_uid", null);
            if (uid != null && !uid.trim().isEmpty()) {
                Intent restartService = new Intent(getApplicationContext(), JChattSyncService.class);
                restartService.setPackage(getPackageName());
                PendingIntent pi = PendingIntent.getService(
                    getApplicationContext(),
                    1002,
                    restartService,
                    PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    long triggerAt = System.currentTimeMillis() + 1500;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                }
            }
        } catch (Exception ignored) {}

        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
