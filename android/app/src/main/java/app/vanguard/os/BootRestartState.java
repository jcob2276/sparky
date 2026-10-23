package app.vanguard.os;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

/**
 * Persisted intent "the user wants the telemetry foreground service running" plus the outcome of
 * the last boot attempt. The wanted flag is set by the service itself once it is really in the
 * foreground and cleared only when the user stops it from the app, so a reboot restores exactly
 * what was running before.
 */
final class BootRestartState {

    static final String RESULT_NONE = "none";
    static final String RESULT_STARTED = "started";
    static final String RESULT_NO_BG_LOCATION = "no_background_location";
    static final String RESULT_NO_LOCATION = "no_location_permission";
    static final String RESULT_REFUSED = "refused";

    private static final String PREFS = "boot_restart";
    private static final String KEY_WANTED = "telemetry_wanted";
    private static final String KEY_RESULT = "last_result";
    private static final String KEY_AT = "last_at";

    private BootRestartState() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isWanted(Context ctx) {
        return prefs(ctx).getBoolean(KEY_WANTED, false);
    }

    static void setWanted(Context ctx, boolean wanted) {
        prefs(ctx).edit().putBoolean(KEY_WANTED, wanted).apply();
    }

    static void recordResult(Context ctx, String result) {
        prefs(ctx).edit()
            .putString(KEY_RESULT, result)
            .putLong(KEY_AT, System.currentTimeMillis())
            .apply();
    }

    static String lastResult(Context ctx) {
        return prefs(ctx).getString(KEY_RESULT, RESULT_NONE);
    }

    static long lastResultAt(Context ctx) {
        return prefs(ctx).getLong(KEY_AT, 0L);
    }

    static boolean hasBackgroundLocation(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }
}
