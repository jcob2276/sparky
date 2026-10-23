package app.vanguard.os;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Keeps Vanguard telemetry & Oura BLE Direct sync alive in background.
 * Owns the Fused {@link LocationCollector} (foreground service type: location) and fires
 * periodic sync ticks that also flush the offline location queue from the web layer.
 */
public class TelemetryForegroundService extends Service {

    private static final String TAG = "TelemetryService";
    static final String ACTION_SYNC_TICK = "app.vanguard.os.SYNC_TICK";
    static final int NOTIFICATION_ID = 73001;
    private static final String CHANNEL_ID = "vanguard_telemetry";
    private static final long SYNC_INTERVAL_MS = 15L * 60L * 1000L; // 15 mins

    private final Handler handler = new Handler(Looper.getMainLooper());
    private LocationCollector collector;
    private final Runnable syncRunnable = new Runnable() {
        @Override
        public void run() {
            Log.i(TAG, "Triggering background sync tick (Location, App Usage & Oura BLE)...");
            if (collector != null) {
                if (!collector.start()) {
                    Log.w(TAG, "Location permission missing at tick; collector idle");
                }
                collector.ensureAlive();
            }
            BackgroundSyncPlugin.notifySyncTickFromService();
            handler.postDelayed(this, SYNC_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!enterForeground()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        TelemetryForegroundServiceHolder.setRunning(true);
        if (collector == null) collector = new LocationCollector(this);
        if (!collector.start()) {
            Log.w(TAG, "Location permission missing; collector not started");
        }
        handler.removeCallbacks(syncRunnable);
        handler.post(syncRunnable);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(syncRunnable);
        if (collector != null) {
            collector.stop();
            collector = null;
        }
        TelemetryForegroundServiceHolder.setRunning(false);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /**
     * Android 14+ throws SecurityException when a location-type FGS starts without a location
     * permission, so degrade gracefully instead of crashing the process.
     */
    private boolean enterForeground() {
        try {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                : 0;
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type);
            return true;
        } catch (SecurityException | IllegalStateException e) {
            Log.e(TAG, "startForeground(location) refused", e);
            return false;
        }
    }

    private Notification buildNotification() {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            this,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Sparky")
            .setContentText("Lokalizacja, ekran i Oura synchronizują się w tle")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pending)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Telemetry sync",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Synchronizacja czasu ekranu, biometrii Oura BLE i lokalizacji w tle");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
