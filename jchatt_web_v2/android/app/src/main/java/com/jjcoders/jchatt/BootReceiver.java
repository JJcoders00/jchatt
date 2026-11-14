package com.jjcoders.jchatt;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Bundle;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            try {
                String channelId = "jchatt_sync_channel";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationChannel channel = new NotificationChannel(
                        channelId,
                        "JChatt Background Service",
                        NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("Keeps secure calls and messages connected in background");
                    channel.setShowBadge(false);
                    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
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
    }
}
