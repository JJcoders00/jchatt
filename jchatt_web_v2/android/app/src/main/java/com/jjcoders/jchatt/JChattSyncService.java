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
    public static final String CHANNEL_SYNC_ID = "jchatt_sync_v8";
    public static final String CHANNEL_MESSAGES_ID = "jchatt_messages_v8";
    public static final String CHANNEL_CALLS_ID = "jchatt_calls_v8";
    public static final int SYNC_NOTIF_ID = 7771;
    public static final int SYNC_CALL_NOTIF_ID = 8882;

    public static final int COLOR_WHATSAPP_EMERALD = Color.parseColor("#00a884");

    private PowerManager.WakeLock wakeLock;
    private volatile boolean isRunning = false;
    private Thread syncThread;
    private Thread callMonitorThread;
    private final Set<String> seenMessageIds = new HashSet<>();
    private ConnectivityManager.NetworkCallback networkCallback;
    private volatile String activeRingingCallId = null;

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
            if (cm != null) {
                NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();
                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        // Wake up sync thread immediately when data network restores
                        if (syncThread != null && syncThread.isAlive()) {
                            syncThread.interrupt();
                        }
                    }
                };
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

        if (!isRunning) {
            isRunning = true;
            startSyncWorkerThread();
            startCallMonitorThread();
            scheduleNextKeepAliveAlarm();
        }

        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Silent Ongoing Foreground Channel
            NotificationChannel syncChannel = new NotificationChannel(
                CHANNEL_SYNC_ID,
                "JChatt Background Service",
                NotificationManager.IMPORTANCE_LOW
            );
            syncChannel.setDescription("Keeps secure background connection open for incoming messages & calls");
            syncChannel.setShowBadge(false);
            syncChannel.enableLights(false);
            syncChannel.enableVibration(false);
            syncChannel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            nm.createNotificationChannel(syncChannel);

            // 2. High-Priority Heads-Up Messages Channel
            NotificationChannel msgChannel = new NotificationChannel(
                CHANNEL_MESSAGES_ID,
                "Encrypted Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            msgChannel.setDescription("Real-time notifications for incoming encrypted messages");
            msgChannel.enableLights(true);
            msgChannel.setLightColor(COLOR_WHATSAPP_EMERALD);
            msgChannel.enableVibration(true);
            msgChannel.setVibrationPattern(new long[]{0, 250, 250, 250});
            Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build();
            msgChannel.setSound(defaultSound, audioAttributes);
            msgChannel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            nm.createNotificationChannel(msgChannel);

            // 3. Telegram / WhatsApp Full-Screen Incoming Calls Channel
            NotificationChannel callChannel = new NotificationChannel(
                CHANNEL_CALLS_ID,
                "Encrypted Voice & Video Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Incoming call ringing alerts");
            callChannel.enableLights(true);
            callChannel.setLightColor(COLOR_WHATSAPP_EMERALD);
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[]{0, 1000, 1000, 1000, 1000});
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes callAudioAttrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            callChannel.setSound(ringtoneUri, callAudioAttrs);
            callChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(callChannel);
        }
    }

    private void startOngoingForeground() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent == null) launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pi = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) : PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_SYNC_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setColor(COLOR_WHATSAPP_EMERALD)
            .setContentTitle("JChatt")
            .setContentText("Private connection active")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .setContentIntent(pi);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int types = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL;
            }
            if (Build.VERSION.SDK_INT >= 34) {
                types |= ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING;
            }
            startForeground(SYNC_NOTIF_ID, builder.build(), types);
        } else {
            startForeground(SYNC_NOTIF_ID, builder.build());
        }
    }

    private void startSyncWorkerThread() {
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

    private void startCallMonitorThread() {
        callMonitorThread = new Thread(() -> {
            while (isRunning) {
                try {
                    SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                    String uid = prefs.getString("sync_uid", null);
                    if (uid == null || uid.isEmpty()) {
                        Thread.sleep(3000);
                        continue;
                    }

                    checkIncomingCalls(uid);
                    Thread.sleep(3000);
                } catch (InterruptedException ie) {
                    break;
                } catch (Exception e) {
                    try { Thread.sleep(3000); } catch (Exception ignored) {}
                }
            }
        });
        callMonitorThread.setName("JChatt-Call-Monitor");
        callMonitorThread.start();
    }

    private void checkIncomingCalls(String uid) {
        try {
            String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/calls/" + uid + ".json";
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);

            int code = conn.getResponseCode();
            if (code != 200) {
                conn.disconnect();
                return;
            }

            BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();
            conn.disconnect();

            String json = sb.toString().trim();
            if (json.equals("null") || json.isEmpty()) {
                if (activeRingingCallId != null) {
                    dismissActiveCallNotification();
                }
                return;
            }

            JSONObject callsObj = new JSONObject(json);
            Iterator<String> keys = callsObj.keys();
            long now = System.currentTimeMillis();
            boolean foundRinging = false;

            while (keys.hasNext()) {
                String cId = keys.next();
                JSONObject c = callsObj.optJSONObject(cId);
                if (c == null) continue;

                String status = c.optString("status", "");
                long ts = c.optLong("ts", 0L);

                if ("ringing".equals(status) && (ts >= (now - 50000))) {
                    foundRinging = true;
                    if (!cId.equals(activeRingingCallId)) {
                        activeRingingCallId = cId;
                        triggerIncomingCallAlert(uid, cId, c);
                    }
                    break;
                }
            }

            if (!foundRinging && activeRingingCallId != null) {
                dismissActiveCallNotification();
            }
        } catch (Exception ignored) {}
    }

    private void triggerIncomingCallAlert(String myUid, String callId, JSONObject callObj) {
        try {
            JSONObject caller = callObj.optJSONObject("caller");
            String callerName = caller != null ? caller.optString("name", "Contact") : "Contact";
            String callerHandle = caller != null ? caller.optString("handle", "") : "";
            String callerUid = caller != null ? caller.optString("uid", "") : "";
            boolean isVideo = callObj.optBoolean("video", false);

            // 1. Wake the screen immediately
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock callWake = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "JChatt::CallWakeScreen"
                );
                callWake.acquire(45000);
            }

            // 2. Prepare full-screen intent to IncomingCallActivity
            Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
            fullScreenIntent.putExtra("callId", callId);
            fullScreenIntent.putExtra("callerUid", callerUid);
            fullScreenIntent.putExtra("callerName", callerName);
            fullScreenIntent.putExtra("callerHandle", callerHandle);
            fullScreenIntent.putExtra("video", isVideo);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this,
                8881,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // 3. Decline Action
            Intent declineIntent = new Intent(this, NotificationActionReceiver.class);
            declineIntent.setAction(NotificationActionReceiver.ACTION_DECLINE_CALL);
            declineIntent.putExtra("callId", callId);
            declineIntent.putExtra("notifId", SYNC_CALL_NOTIF_ID);
            PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
                this,
                8882,
                declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // 4. Answer Action
            Intent answerIntent = new Intent(this, MainActivity.class);
            answerIntent.setAction("ACTION_ANSWER_CALL");
            answerIntent.putExtra("callId", callId);
            answerIntent.putExtra("callerUid", callerUid);
            answerIntent.putExtra("video", isVideo);
            answerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent answerPendingIntent = PendingIntent.getActivity(
                this,
                8883,
                answerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_CALLS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(callerName)
                .setContentText(isVideo ? "Incoming Encrypted Video Call..." : "Incoming Encrypted Voice Call...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(false)
                .setColor(COLOR_WHATSAPP_EMERALD)
                .setContentIntent(fullScreenPendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .addAction(R.drawable.ic_call_end, "Decline", declinePendingIntent)
                .addAction(R.drawable.ic_call_answer, "Answer", answerPendingIntent);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(SYNC_CALL_NOTIF_ID, b.build());
            }

            // Also launch IncomingCallActivity directly to turn screen ON immediately
            startActivity(fullScreenIntent);
        } catch (Exception ignored) {}
    }

    private void dismissActiveCallNotification() {
        activeRingingCallId = null;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(SYNC_CALL_NOTIF_ID);
            }
        } catch (Exception ignored) {}
    }

    private void scheduleNextKeepAliveAlarm() {
        try {
            Intent restartBroadcast = new Intent(this, BootReceiver.class);
            restartBroadcast.setAction("com.jjcoders.jchatt.RESTART_SYNC");
            PendingIntent pi = PendingIntent.getBroadcast(
                this,
                1005,
                restartBroadcast,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = System.currentTimeMillis() + (15 * 60 * 1000L); // 15 minutes
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception ignored) {}
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
            conn.setReadTimeout(90000); // 90 seconds timeout for dead connection detection & auto-reconnect
            conn.connect();

            int code = conn.getResponseCode();
            if (code == 401 || code == 403) {
                prefs.edit().remove("sync_token").apply();
                refreshTokenFromSavedCredentials();

                conn.disconnect();
                url = new URL("https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/userChats/" + uid + ".json");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Accept", "text/event-stream");
                conn.setRequestProperty("User-Agent", "JChattNativeSync/2.0");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(90000);
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
                    if (!dataJson.isEmpty() && !dataJson.equals("null")) {
                        handleSseData(uid, currentEvent, dataJson, isInitialBatch);
                        isInitialBatch = false;
                    }
                }
            }
        } catch (Exception e) {
            // Socket timeout or connection drop: safely reconnect
        } finally {
            try { if (reader != null) reader.close(); } catch (Exception ignored) {}
            try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
        }
    }

    private void refreshTokenFromSavedCredentials() {
        try {
            SharedPreferences prefs = getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
            String savedJson = prefs.getString("saved_account_json", null);
            if (savedJson == null) return;
            JSONObject acc = new JSONObject(savedJson);
            String email = acc.optString("email", "");
            String password = acc.optString("password", "");
            if (email.isEmpty() || password.isEmpty()) return;

            String apiKey = "AIzaSy" + "Da2sD-" + "7Yd2R1b68" + "n5W1G1B0p" + "M5p7B-qZ44k";
            URL url = new URL("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + apiKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);

            JSONObject req = new JSONObject();
            req.put("email", email);
            req.put("password", password);
            req.put("returnSecureToken", true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(req.toString().getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String l;
                    while ((l = r.readLine()) != null) sb.append(l);
                    JSONObject res = new JSONObject(sb.toString());
                    String idToken = res.optString("idToken", "");
                    if (!idToken.isEmpty()) {
                        prefs.edit().putString("sync_token", idToken).apply();
                    }
                }
            }
            conn.disconnect();
        } catch (Exception ignored) {}
    }

    private void handleSseData(String uid, String event, String jsonStr, boolean isInitial) {
        try {
            JSONObject root = new JSONObject(jsonStr);
            String path = root.optString("path", "");
            Object dataObj = root.opt("data");

            if (path.equals("/") && dataObj instanceof JSONObject) {
                JSONObject allChats = (JSONObject) dataObj;
                Iterator<String> chatIds = allChats.keys();
                while (chatIds.hasNext()) {
                    String chatId = chatIds.next();
                    JSONObject chat = allChats.optJSONObject(chatId);
                    if (chat != null) {
                        processSingleChat(uid, chatId, chat, isInitial);
                    }
                }
            } else if (dataObj instanceof JSONObject) {
                JSONObject data = (JSONObject) dataObj;
                if (data.has("lastMsgId")) {
                    String chatId = path.replace("/", "").trim();
                    processSingleChat(uid, chatId, data, isInitial);
                } else {
                    Iterator<String> keys = data.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        Object inner = data.opt(key);
                        if (inner instanceof JSONObject && ((JSONObject) inner).has("lastMsgId")) {
                            processSingleChat(uid, key, (JSONObject) inner, isInitial);
                        }
                    }
                }
            } else if (dataObj instanceof String || dataObj instanceof Number) {
                if (path.contains("/")) {
                    String[] parts = path.split("/");
                    if (parts.length >= 2) {
                        String chatId = parts[1];
                        fetchSingleChatAndProcess(uid, chatId);
                    }
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
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                if (conn.getResponseCode() == 200) {
                    try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        String l;
                        while ((l = r.readLine()) != null) sb.append(l);
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
                // 1. Immediately mark message as DELIVERED in Firebase (sender sees grey double tick!)
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

            // Disguise presets check
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
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setColor(COLOR_WHATSAPP_EMERALD)
                    .setContentTitle(notifTitle)
                    .setContentText(notifBody)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                    .setAutoCancel(true)
                    .setContentIntent(pi);
                nm.notify(notifId, disguisedBuilder.build());
                return;
            }

            // Quick Inline Reply Action (Telegram / WhatsApp Standard)
            RemoteInput remoteInput = new RemoteInput.Builder(NotificationActionReceiver.EXTRA_VOICE_REPLY)
                .setLabel("Type a reply...")
                .build();

            Intent replyIntent = new Intent(this, NotificationActionReceiver.class);
            replyIntent.setAction(NotificationActionReceiver.ACTION_REPLY);
            replyIntent.putExtra("chatId", chatId);
            replyIntent.putExtra("notifId", notifId);

            PendingIntent replyPi = PendingIntent.getBroadcast(
                this,
                notifId + 1,
                replyIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_MUTABLE : 0)
            );

            NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_call_answer,
                "Reply",
                replyPi
            ).addRemoteInput(remoteInput).build();

            // Mark as Read Action
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
                R.drawable.ic_call_end,
                "Mark as read",
                readPi
            ).build();

            Notification publicVersion = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setColor(COLOR_WHATSAPP_EMERALD)
                .setContentTitle(sender)
                .setContentText(text)
                .build();

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
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
