package app.vanguard.os;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * 24/7 Foreground Service for Vanguard Oura BLE Direct Sync.
 *
 * Keeps continuous BLE connection alive with Oura Ring overnight,
 * streaming raw R-R intervals, heart rate, and skin temperature directly
 * into native SQLite (vanguard_oura.db) for 100% offline sleep staging (noop parity).
 */
public class OuraForegroundService extends Service {

    private static final String TAG = "OuraForegroundService";
    private static final int NOTIFICATION_ID = 74001;
    private static final String CHANNEL_ID = "vanguard_oura_ble";
    private static final long POLL_INTERVAL_MS = OuraBleProtocol.historyPollIntervalMs();

    private static OuraForegroundService instance;
    private OuraBleDriver bleDriver;
    private String activeMacAddress;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean isRunning = false;

    public static OuraForegroundService getInstance() {
        return instance;
    }

    public OuraBleDriver getBleDriver() {
        return bleDriver;
    }

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (bleDriver != null) {
                Log.d(TAG, "Background polling Oura BLE history...");
                bleDriver.fetchHistory(0);
            }
            if (isRunning) {
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        }
    };

    public static void start(Context ctx, String macAddress) {
        if (macAddress != null && !macAddress.isEmpty()) {
            ctx.getSharedPreferences("vanguard_oura_ble", Context.MODE_PRIVATE)
                .edit().putString("device_address", macAddress).apply();
        }
        Intent intent = new Intent(ctx, OuraForegroundService.class);
        intent.putExtra("mac_address", macAddress);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }
    }

    public static void stop(Context ctx) {
        Intent intent = new Intent(ctx, OuraForegroundService.class);
        ctx.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String macAddress = intent != null ? intent.getStringExtra("mac_address") : null;
        if (macAddress == null || macAddress.isEmpty()) {
            macAddress = getSharedPreferences("vanguard_oura_ble", MODE_PRIVATE)
                .getString("device_address", null);
        }
        if (Build.VERSION.SDK_INT >= 29) { // Build.VERSION_CODES.Q
            startForeground(NOTIFICATION_ID, buildNotification(macAddress), 
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification(macAddress));
        }

        if (!isRunning) {
            isRunning = true;
            initBleDriver(macAddress);
            handler.post(pollRunnable);
        } else if (needsDriverRestart(activeMacAddress, macAddress)) {
            Log.i(TAG, "Selected Oura address changed from " + activeMacAddress
                + " to " + macAddress + "; replacing stale GATT target");
            if (bleDriver != null) {
                bleDriver.disconnect();
                bleDriver = null;
            }
            initBleDriver(macAddress);
        }

        return START_STICKY;
    }

    private void initBleDriver(String macAddress) {
        if (bleDriver != null) return;
        activeMacAddress = macAddress;

        bleDriver = new OuraBleDriver(new OuraBleDriver.ConnectionCallback() {
            @Override
            public void onConnected() {
                Log.i(TAG, "Oura Ring connected in background service!");
            }

            @Override
            public void onDisconnected() {
                // autoConnect=true handles reconnection automatically via Android BLE whitelist.
                // Do NOT call connectDevice() here — that creates a second competing GATT connection
                // (the root cause of status=147 / multiple-thread auth race).
                Log.i(TAG, "Oura Ring disconnected — autoConnect will restore connection automatically.");
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "BLE Service Error: " + error);
            }

            @Override
            public void onNotificationReceived(byte[] data) {}

            @Override
            public void onLiveHrReceived(int bpm, int ibiMs) {}

            @Override
            public void onDataFlushed() {
                Log.i(TAG, "Oura BLE background sync flushed to SQLite.");
            }
        });

        bleDriver.attachStore(this, macAddress != null ? "oura:" + macAddress : "oura-ring");
        if (macAddress != null && !macAddress.isEmpty()) {
            bleDriver.connectDevice(this, macAddress);
        }
    }

    static boolean needsDriverRestart(String activeAddress, String requestedAddress) {
        if (requestedAddress == null || requestedAddress.isEmpty()) return false;
        return activeAddress == null || !requestedAddress.equalsIgnoreCase(activeAddress);
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        instance = null;
        handler.removeCallbacks(pollRunnable);
        if (bleDriver != null) {
            bleDriver.disconnect();
            bleDriver = null;
        }
        activeMacAddress = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private Notification buildNotification(String macAddress) {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            this,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String statusText = macAddress != null ? "Podłączono: " + macAddress : "Rejestracja snu i biometrii BLE w tle";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Sparky Oura BLE Service")
            .setContentText(statusText)
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
            "Oura BLE Direct Service",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Całonocne zbieranie próbek R-R i biometrii z Oura Ring do bazy SQLite");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
