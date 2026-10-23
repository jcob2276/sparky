package app.vanguard.os;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Per-collector toggles and local Wi-Fi labels for the phone signal collectors.
 * Everything here stays on the device: SSIDs are never uploaded, only their label.
 */
final class DeviceSignalConfig {

    static final String[] KINDS = {
        "battery", "network", "steps", "screen", "dnd", "notif", "audio", "light", "traffic"
    };

    /** Collectors that need an extra runtime/special permission start disabled. */
    private static final Set<String> DEFAULT_OFF = new HashSet<>(Arrays.asList("steps", "notif"));
    private static final String PREFS = "device_signals";
    private static final String KEY_MASTER = "master";
    private static final String KEY_WIFI_LABELS = "wifi_labels";

    private DeviceSignalConfig() {}

    static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isKnownKind(String kind) {
        return kind != null && Arrays.asList(KINDS).contains(kind);
    }

    static boolean isMasterOn(Context ctx) {
        return prefs(ctx).getBoolean(KEY_MASTER, true);
    }

    static void setMaster(Context ctx, boolean on) {
        prefs(ctx).edit().putBoolean(KEY_MASTER, on).apply();
    }

    static boolean isEnabled(Context ctx, String kind) {
        if (!isMasterOn(ctx)) return false;
        return isKindToggled(ctx, kind);
    }

    /** Raw toggle value, ignoring the master switch (for the settings card). */
    static boolean isKindToggled(Context ctx, String kind) {
        return prefs(ctx).getBoolean("kind_" + kind, !DEFAULT_OFF.contains(kind));
    }

    static void setEnabled(Context ctx, String kind, boolean on) {
        prefs(ctx).edit().putBoolean("kind_" + kind, on).apply();
    }

    /** Returns "home" / "work" / "other" for a known SSID, or "other" when it has no label. */
    static String wifiLabelFor(Context ctx, String ssid) {
        if (ssid == null) return null;
        try {
            JSONObject labels = new JSONObject(prefs(ctx).getString(KEY_WIFI_LABELS, "{}"));
            return labels.optString(ssid, "other");
        } catch (JSONException e) {
            return "other";
        }
    }

    static void setWifiLabel(Context ctx, String ssid, String label) {
        if (ssid == null) return;
        try {
            JSONObject labels = new JSONObject(prefs(ctx).getString(KEY_WIFI_LABELS, "{}"));
            if (label == null) {
                labels.remove(ssid);
            } else {
                labels.put(ssid, label);
            }
            prefs(ctx).edit().putString(KEY_WIFI_LABELS, labels.toString()).apply();
        } catch (JSONException ignored) {
            // keep previous labels
        }
    }
}
