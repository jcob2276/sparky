package app.vanguard.os;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Revives the phone signal collectors after a reboot or an app update.
 *
 * Android 14+ rules this respects:
 *  - BOOT_COMPLETED may start a foreground service, but one of type "location" is only allowed to
 *    receive location when the app holds ACCESS_BACKGROUND_LOCATION (while-in-use restriction),
 *    otherwise startForeground() throws. So we check the permission first instead of crashing.
 *  - Every failure (ForegroundServiceStartNotAllowedException is an IllegalStateException) is
 *    caught and recorded, because an uncaught exception here would kill the receiver process.
 *  - The cheap, event-driven collectors are started regardless; they need no foreground service
 *    and are also revived by the notification listener when the user granted that access.
 */
public class BootCompletedReceiver extends BroadcastReceiver {

    private static final String TAG = "BootCompletedReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }
        Context app = context.getApplicationContext();
        try {
            DeviceSignalCollector.get(app).start();
        } catch (RuntimeException e) {
            Log.e(TAG, "signal collectors failed to start", e);
        }
        if (!BootRestartState.isWanted(app)) return;
        startTelemetryService(app);
    }

    private void startTelemetryService(Context app) {
        if (!LocationCollector.hasLocationPermission(app)) {
            BootRestartState.recordResult(app, BootRestartState.RESULT_NO_LOCATION);
            return;
        }
        if (!BootRestartState.hasBackgroundLocation(app)) {
            BootRestartState.recordResult(app, BootRestartState.RESULT_NO_BG_LOCATION);
            return;
        }
        try {
            Intent service = new Intent(app, TelemetryForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                app.startForegroundService(service);
            } else {
                app.startService(service);
            }
            BootRestartState.recordResult(app, BootRestartState.RESULT_STARTED);
        } catch (SecurityException | IllegalStateException e) {
            Log.e(TAG, "telemetry service start refused", e);
            BootRestartState.recordResult(app, BootRestartState.RESULT_REFUSED);
        }
    }
}
