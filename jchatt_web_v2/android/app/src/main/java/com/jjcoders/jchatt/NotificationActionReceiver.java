package com.jjcoders.jchatt;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class NotificationActionReceiver extends BroadcastReceiver {
    public static final String ACTION_REPLY = "com.jjcoders.jchatt.ACTION_REPLY";
    public static final String ACTION_MARK_READ = "com.jjcoders.jchatt.ACTION_MARK_READ";
    public static final String EXTRA_VOICE_REPLY = "extra_voice_reply";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String chatId = intent.getStringExtra("chatId");
        int notifId = intent.getIntExtra("notifId", -1);

        if (notifId != -1) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notifId);
            }
        }

        SharedPreferences prefs = context.getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
        String uid = prefs.getString("sync_uid", null);
        String token = prefs.getString("sync_token", null);

        if (ACTION_MARK_READ.equals(action)) {
            // Dismiss notification and mark delivered/read
            if (chatId != null && uid != null) {
                markChatReadAsync(chatId, uid, token);
            }
        } else if (ACTION_REPLY.equals(action)) {
            Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
            if (remoteInput != null) {
                CharSequence replyText = remoteInput.getCharSequence(EXTRA_VOICE_REPLY);
                if (!TextUtils.isEmpty(replyText) && chatId != null && uid != null) {
                    sendDirectReplyAsync(chatId, uid, token, replyText.toString(), prefs);
                }
            }
        }
    }

    private void markChatReadAsync(String chatId, String uid, String token) {
        new Thread(() -> {
            try {
                String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/userChats/" + uid + "/" + chatId + "/unread.json";
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
                    os.write("0".getBytes(StandardCharsets.UTF_8));
                }
                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) {}
        }).start();
    }

    private void sendDirectReplyAsync(String chatId, String uid, String token, String text, SharedPreferences prefs) {
        new Thread(() -> {
            try {
                long now = System.currentTimeMillis();
                String msgId = "m_" + (now % 10000000) + "_" + (int)(Math.random() * 10000);
                String savedJson = prefs.getString("saved_account_json", null);
                String myName = "User";
                if (savedJson != null) {
                    try {
                        JSONObject acc = new JSONObject(savedJson);
                        myName = acc.optString("name", acc.optString("handle", "User"));
                    } catch (Exception ignored) {}
                }

                JSONObject msg = new JSONObject();
                msg.put("id", msgId);
                msg.put("from", uid);
                msg.put("fromName", myName);
                msg.put("kind", "text");
                msg.put("text", text);
                msg.put("ts", now);

                String urlStr = "https://jjcodersjchatt-default-rtdb.firebaseio.com/v2/messages/" + chatId + "/" + msgId + ".json";
                if (token != null && !token.trim().isEmpty()) {
                    urlStr += "?auth=" + token.trim();
                }

                URL url = new URL(urlStr);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PUT");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(msg.toString().getBytes(StandardCharsets.UTF_8));
                }
                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) {}
        }).start();
    }
}
