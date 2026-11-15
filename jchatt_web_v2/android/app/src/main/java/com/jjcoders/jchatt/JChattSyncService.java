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
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

public class JChattSyncService extends Service {
    public static final String CHANNEL_SYNC_ID = "jchatt_sync_v7";
    public static final String CHANNEL_MESSAGES_ID = "jchatt_messages_v7";
    public static final int SYNC_NOTIF_ID = 7771;

    // Luxury WhatsApp Emerald Theme Accent
    public static final int COLOR_WHATSAPP_EMERALD = Color.parseColor("#00a884");

    private PowerManager.WakeLock wakeLock;
    private volatile boolean isRunning = false;
    private Thread syncThread;
    private final Set<String> seenMessageIds = new HashSet<>();
    private ConnectivityManager.NetworkCallback networkCallback;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        startOngoingForeground();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JChatt::NativeSyncLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
            }
        } catch (Exception ignored) {}

        registerNetworkMonitor();
    }

    private void registerNetworkMonitor() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        super.onAvailable(network);
                        // Trigger immediate reconnect if thread is sleeping or dropped
                        if (syncThread != null && syncThread.isAlive()) {
                            syncThread.interrupt();
                        } else {
                            startBackgroundSyncWorker();
                        }
                    }
                };
                NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();
                cm.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String uid = intent.getStringExtra("sync_uid");
            String token = intent.getStringExtra("sync_token");
            if (uid != null && !uid.trim().isEmpty()) {
                SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor ed = prefs.edit().putString("sync_uid", uid.trim());
                if (token != null) ed.putString("sync_token", token.trim());
                ed.apply();
            }
        }

        startOngoingForeground();
        startBackgroundSyncWorker();
        scheduleWatchdogPing();
        return START_STICKY;
    }

    private void scheduleWatchdogPing() {
        try {
            Intent pingIntent = new Intent(this, BootReceiver.class);
            pingIntent.setAction("com.jjcoders.jchatt.RESTART_SYNC");
            PendingIntent pi = PendingIntent.getBroadcast(
                this,
                1003,
                pingIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long fiveMin = 5 * 60 * 1000L;
                am.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + fiveMin, fiveMin, pi);
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Silent keepalive sync channel (IMPORTANCE_MIN suppresses status bar icon completely)
            NotificationChannel syncChannel = new NotificationChannel(
                CHANNEL_SYNC_ID,
                "JChatt Background Sync",
                NotificationManager.IMPORTANCE_MIN
            );
            syncChannel.setDescription("Keeps secure background connection open for incoming messages & calls");
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
            msgChannel.setLightColor(COLOR_WHATSAPP_EMERALD);
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
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(COLOR_WHATSAPP_EMERALD)
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
                    // Woken up by network callback or restart
                } catch (Exception e) {
                    try { Thread.sleep(4000); } catch (Exception ignored) {}
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
            if (code == 401 || code == 403) {
                // Token expired! Remove invalid token and reconnect with public read (.read: true)
                prefs.edit().remove("sync_token").apply();
                refreshTokenFromSavedCredentials();

                conn.disconnect();
                url = new URL("https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/userChats/" + uid + ".json");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Accept", "text/event-stream");
                conn.setRequestProperty("User-Agent", "JChattNativeSync/2.0");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(0);
                conn.connect();
                code = conn.getResponseCode();
            }

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

    private void refreshTokenFromSavedCredentials() {
        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String savedJson = prefs.getString("saved_account_json", null);
            if (savedJson == null || savedJson.trim().isEmpty()) return;
            JSONObject acc = new JSONObject(savedJson);
            String email = acc.optString("email", "");
            String password = acc.optString("password", "");
            if (email.isEmpty() || password.isEmpty()) return;

            URL authUrl = new URL("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDkISiLKl_1XuY66Y52rLoryKL8m9J7BK8");
            HttpURLConnection authConn = (HttpURLConnection) authUrl.openConnection();
            authConn.setRequestMethod("POST");
            authConn.setRequestProperty("Content-Type", "application/json");
            authConn.setDoOutput(true);
            authConn.setConnectTimeout(10000);
            authConn.setReadTimeout(10000);

            JSONObject req = new JSONObject();
            req.put("email", email);
            req.put("password", password);
            req.put("returnSecureToken", true);

            try (OutputStream os = authConn.getOutputStream()) {
                os.write(req.toString().getBytes(StandardCharsets.UTF_8));
            }

            if (authConn.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(authConn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String l;
                    while ((l = br.readLine()) != null) sb.append(l);
                    JSONObject res = new JSONObject(sb.toString());
                    String idToken = res.optString("idToken", "");
                    if (!idToken.isEmpty()) {
                        prefs.edit().putString("sync_token", idToken).apply();
                    }
                }
            }
            authConn.disconnect();
        } catch (Exception ignored) {}
    }

    private void handleSseData(String uid, String event, String jsonStr, boolean isInitial) {
        try {
            JSONObject root = new JSONObject(jsonStr);
            String path = root.optString("path", "");
            Object dataObj = root.opt("data");

            if (dataObj instanceof JSONObject) {
                JSONObject data = (JSONObject) dataObj;
                // If it has chat properties directly (e.g. put to /chat_id)
                if (data.has("lastText") || data.has("lastMsgId")) {
                    String chatId = path.replace("/", "").trim();
                    processSingleChat(uid, chatId, data, isInitial);
                } else {
                    // It is a map of chats (e.g. put to /)
                    Iterator<String> keys = data.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        JSONObject chatObj = data.optJSONObject(key);
                        if (chatObj != null) {
                            processSingleChat(uid, key, chatObj, isInitial);
                        }
                    }
                }
            } else if (dataObj instanceof String || dataObj instanceof Number) {
                // Firebase patch or put on a child path (e.g. path="/chat_id/lastText" or "/chat_id/lastMsgId")
                String[] parts = path.split("/");
                if (parts.length >= 2) {
                    String chatId = parts[1];
                    fetchSingleChatAndProcess(uid, chatId);
                }
            }
        } catch (Exception ignored) {}
    }

    private void fetchSingleChatAndProcess(String uid, String chatId) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                String token = prefs.getString("sync_token", null);
                String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/userChats/" + uid + "/" + chatId + ".json";
                if (token != null && !token.trim().isEmpty()) {
                    urlStr += "?auth=" + token.trim();
                }
                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("User-Agent", "JChattNativeSync/2.0");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                if (conn.getResponseCode() == 200) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        String l;
                        while ((l = br.readLine()) != null) sb.append(l);
                        JSONObject chat = new JSONObject(sb.toString());
                        processSingleChat(uid, chatId, chat, false);
                    }
                }
                conn.disconnect();
            } catch (Exception ignored) {}
        }).start();
    }

    private void processSingleChat(String uid, String chatId, JSONObject chat, boolean isInitial) {
        try {
            String lastMsgId = chat.optString("lastMsgId", "");
            String lastFrom = chat.optString("lastFrom", "");
            String lastText = chat.optString("lastText", "New message");
            String senderName = chat.optString("name", chat.optString("handle", "JChatt Contact"));
            long lastTs = chat.optLong("lastTs", 0L);

            if (lastMsgId.isEmpty() || lastFrom.isEmpty()) return;

            // If message is from someone else:
            if (!lastFrom.equals(uid)) {
                // 1. Immediately mark message as DELIVERED in Firebase via quick HTTP PUT!
                markDeliveredInFirebase(chatId, lastMsgId, uid);

                // 2. Notification gating:
                SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                long lastNotifiedTs = prefs.getLong("last_notified_ts", 0L);
                if (lastNotifiedTs == 0L) {
                    lastNotifiedTs = System.currentTimeMillis() - 120000L; // 2 minutes window
                    prefs.edit().putLong("last_notified_ts", lastNotifiedTs).apply();
                }

                boolean isNew = !seenMessageIds.contains(lastMsgId) && (lastTs >= lastNotifiedTs || !isInitial);

                if (isNew) {
                    seenMessageIds.add(lastMsgId);
                    if (lastTs > lastNotifiedTs) {
                        prefs.edit().putLong("last_notified_ts", lastTs).apply();
                    }
                    showNativeMessageNotification(chatId, senderName, lastText);
                } else {
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
                boolean ok = tryPutDelivery(chatId, msgId, uid, token);
                // If auth failed (e.g. expired token), retry without token since rule allows public write to deliveredTo/$uid
                if (!ok && token != null) {
                    tryPutDelivery(chatId, msgId, uid, null);
                }
            } catch (Exception ignored) {}
        }).start();
    }

    private boolean tryPutDelivery(String chatId, String msgId, String uid, String token) {
        try {
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
            conn.setReadTimeout(8000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write("true".getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code >= 200 && code < 300);
        } catch (Exception e) {
            return false;
        }
    }

    private void showNativeMessageNotification(String chatId, String sender, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String notifPreset = prefs.getString("notif_preset", "default");
            String disguiseMode = prefs.getString("disguise_mode", "default");

            int notifId = (int) (System.currentTimeMillis() % 100000);

            // Intent to open chat in app
            Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (intent == null) intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("chatId", chatId);

            PendingIntent pi = PendingIntent.getActivity(
                this,
                notifId,
                intent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) : PendingIntent.FLAG_UPDATE_CURRENT
            );

            // Check if disguise is active
            String notifTitle = sender;
            String notifBody = text;
            boolean isDisguised = false;

            if ("clock".equalsIgnoreCase(notifPreset) || "clock".equalsIgnoreCase(disguiseMode)) {
                isDisguised = true;
                notifTitle = "World Clock";
                String timeStr = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
                notifBody = "Alarm Sync · " + timeStr;
            } else if ("fitness".equalsIgnoreCase(notifPreset) || "fitness".equalsIgnoreCase(disguiseMode)) {
                isDisguised = true;
                notifTitle = "StrideFit Tracker";
                notifBody = "Daily goal: 7,420 steps reached";
            } else if ("calc".equalsIgnoreCase(notifPreset) || "calc".equalsIgnoreCase(disguiseMode)) {
                isDisguised = true;
                notifTitle = "Calculator Memory";
                notifBody = "Calculation history backed up";
            } else if ("ai".equalsIgnoreCase(notifPreset) || "ai".equalsIgnoreCase(disguiseMode)) {
                isDisguised = true;
                notifTitle = "AI Assistant";
                notifBody = "Your background task has completed";
            } else if ("discrete".equalsIgnoreCase(notifPreset) || "discrete".equalsIgnoreCase(disguiseMode)) {
                isDisguised = true;
                notifTitle = "System";
                notifBody = "1 new encrypted notification";
            }

            if (isDisguised) {
                NotificationCompat.Builder disguisedBuilder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setColor(Color.parseColor("#444c56"))
                    .setContentTitle(notifTitle)
                    .setContentText(notifBody)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                nm.notify(notifId, disguisedBuilder.build());
                return;
            }

            // Standard WhatsApp Emerald Green Notification with Action Buttons
            RemoteInput remoteInput = new RemoteInput.Builder(NotificationActionReceiver.EXTRA_VOICE_REPLY)
                .setLabel("Reply")
                .build();

            Intent replyIntent = new Intent(this, NotificationActionReceiver.class);
            replyIntent.setAction(NotificationActionReceiver.ACTION_REPLY);
            replyIntent.putExtra("chatId", chatId);
            replyIntent.putExtra("notifId", notifId);

            PendingIntent replyPi = PendingIntent.getBroadcast(
                this,
                notifId + 1,
                replyIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE)
                    : (PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0))
            );

            NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_action_reply,
                "Reply",
                replyPi
            ).addRemoteInput(remoteInput).build();

            Intent readIntent = new Intent(this, NotificationActionReceiver.class);
            readIntent.setAction(NotificationActionReceiver.ACTION_MARK_READ);
            readIntent.putExtra("chatId", chatId);
            readIntent.putExtra("notifId", notifId);

            PendingIntent readPi = PendingIntent.getBroadcast(
                this,
                notifId + 2,
                readIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Action readAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_action_read,
                "Mark as read",
                readPi
            ).build();

            Notification publicVersion = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(COLOR_WHATSAPP_EMERALD)
                .setContentTitle(sender)
                .setContentText(text)
                .build();

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(COLOR_WHATSAPP_EMERALD)
                .setContentTitle(sender)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .addAction(replyAction)
                .addAction(readAction)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPublicVersion(publicVersion);

            nm.notify(notifId, builder.build());
        } catch (Exception ignored) {}
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        try {
            // Wake-up resurrect alarm via BootReceiver (Compliant with Android 8-14 background execution limits)
            Intent restartBroadcast = new Intent(this, BootReceiver.class);
            restartBroadcast.setAction("com.jjcoders.jchatt.RESTART_SYNC");
            PendingIntent pi = PendingIntent.getBroadcast(
                this,
                1001,
                restartBroadcast,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = System.currentTimeMillis() + 800;
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
            if (networkCallback != null) {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) cm.unregisterNetworkCallback(networkCallback);
            }
        } catch (Exception ignored) {}

        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String uid = prefs.getString("sync_uid", null);
            if (uid != null && !uid.trim().isEmpty()) {
                Intent restartBroadcast = new Intent(this, BootReceiver.class);
                restartBroadcast.setAction("com.jjcoders.jchatt.RESTART_SYNC");
                PendingIntent pi = PendingIntent.getBroadcast(
                    this,
                    1002,
                    restartBroadcast,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
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
            }
        } catch (Exception ignored) {}

        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
