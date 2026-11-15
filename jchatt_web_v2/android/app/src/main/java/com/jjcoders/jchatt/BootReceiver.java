package com.jjcoders.jchatt;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.content.ContextCompat;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_USER_PRESENT.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            try {
                SharedPreferences prefs = context.getSharedPreferences("jchatt_prefs", Context.MODE_PRIVATE);
                String uid = prefs.getString("sync_uid", null);
                if (uid != null && !uid.trim().isEmpty()) {
                    Intent serviceIntent = new Intent(context, JChattSyncService.class);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        ContextCompat.startForegroundService(context, serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
