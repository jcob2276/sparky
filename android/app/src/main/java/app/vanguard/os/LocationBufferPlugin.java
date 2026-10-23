package app.vanguard.os;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * Bridge between the native location queue and the web layer:
 * drain/ack of buffered points, permission status + runtime permission flow.
 */
@CapacitorPlugin(
    name = "LocationBuffer",
    permissions = {
        @Permission(alias = "foreground", strings = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        }),
        @Permission(alias = "background", strings = {Manifest.permission.ACCESS_BACKGROUND_LOCATION})
    }
)
public class LocationBufferPlugin extends Plugin {

    private static final int MAX_DRAIN = 500;

    @Override
    public void load() {
        LocationCollector.listener = pending -> {
            JSObject payload = new JSObject();
            payload.put("pending", pending);
            notifyListeners("locationQueued", payload);
        };
    }

    @Override
    protected void handleOnDestroy() {
        LocationCollector.listener = null;
        super.handleOnDestroy();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        int limit = Math.min(MAX_DRAIN, Math.max(1, call.getInt("limit", 200)));
        LocationQueueStore store = LocationQueueStore.get(getContext());
        JSONArray rows = store.drain(limit);
        try {
            JSObject ret = new JSObject();
            ret.put("points", new JSArray(rows.toString()));
            ret.put("pending", store.count());
            call.resolve(ret);
        } catch (JSONException e) {
            call.reject("DRAIN_FAILED", e);
        }
    }

    @PluginMethod
    public void ack(PluginCall call) {
        try {
            JSArray ids = call.getArray("ids");
            long[] parsed = new long[ids == null ? 0 : ids.length()];
            for (int i = 0; i < parsed.length; i++) parsed[i] = ids.getLong(i);
            LocationQueueStore store = LocationQueueStore.get(getContext());
            store.ack(parsed);
            JSObject ret = new JSObject();
            ret.put("pending", store.count());
            call.resolve(ret);
        } catch (JSONException e) {
            call.reject("ACK_FAILED", e);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void requestForeground(PluginCall call) {
        if (hasFine() || hasCoarse()) {
            call.resolve(buildStatus());
            return;
        }
        requestPermissionForAlias("foreground", call, "permissionResult");
    }

    /** Android 10: runtime dialog. Android 11+: system takes the user to the "Allow all the time" page. */
    @PluginMethod
    public void requestBackground(PluginCall call) {
        if (!(hasFine() || hasCoarse())) {
            call.reject("FOREGROUND_REQUIRED");
            return;
        }
        if (hasBackground()) {
            call.resolve(buildStatus());
            return;
        }
        requestPermissionForAlias("background", call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("LOCATION_SETTINGS_UNAVAILABLE", e);
        }
    }

    private boolean has(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasFine() {
        return has(Manifest.permission.ACCESS_FINE_LOCATION);
    }

    private boolean hasCoarse() {
        return has(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private boolean hasBackground() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || has(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
    }

    private JSObject buildStatus() {
        Context ctx = getContext();
        android.location.LocationManager lm =
            (android.location.LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        JSObject o = new JSObject();
        o.put("fine", hasFine());
        o.put("coarse", hasCoarse());
        o.put("background", hasBackground());
        o.put("notifications",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || has(Manifest.permission.POST_NOTIFICATIONS));
        o.put("gpsEnabled", lm != null && LocationManagerCompat.isLocationEnabled(lm));
        o.put("collectorRunning", LocationCollector.running);
        o.put("mode", LocationCollector.modeName);
        o.put("pending", LocationQueueStore.get(ctx).count());
        o.put("lastFixAtMs", LocationCollector.lastFixAtMs);
        o.put("lastFixAccuracy", Float.isNaN(LocationCollector.lastFixAccuracy) ? -1 : LocationCollector.lastFixAccuracy);
        o.put("accepted", LocationCollector.acceptedCount);
        o.put("rejected", LocationCollector.rejectedCount);
        o.put("lastReject", LocationCollector.lastRejectReason);
        return o;
    }
}
