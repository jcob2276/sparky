package app.vanguard.os;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Bridge for the phone signal collectors: toggles, permission status, queue drain/ack.
 * The collectors themselves run natively (see {@link DeviceSignalCollector}) and keep recording
 * while the WebView is gone; JS only moves queued batches to Supabase.
 */
@CapacitorPlugin(
    name = "DeviceSignals",
    permissions = {
        @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity")
    }
)
public class DeviceSignalsPlugin extends Plugin {

    private static final int QUEUE_HINT_SIZE = 50;
    private static final long QUEUE_HINT_GAP_MS = 60_000L;
    private static DeviceSignalsPlugin instance;
    private final Handler main = new Handler(Looper.getMainLooper());
    private long lastHintAt;

    @Override
    public void load() {
        instance = this;
        DeviceSignalQueue.setSizeListener(DeviceSignalsPlugin::onQueueSize);
        DeviceSignalCollector.get(getContext()).start();
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    private static void onQueueSize(int size) {
        DeviceSignalsPlugin plugin = instance;
        if (plugin == null || size < QUEUE_HINT_SIZE) return;
        long now = System.currentTimeMillis();
        if (now - plugin.lastHintAt < QUEUE_HINT_GAP_MS) return;
        plugin.lastHintAt = now;
        plugin.main.post(() -> plugin.notifyListeners("queueReady", new JSObject()));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        DeviceSignalCollector collector = DeviceSignalCollector.get(ctx);
        JSObject enabled = new JSObject();
        for (String kind : DeviceSignalConfig.KINDS) {
            enabled.put(kind, DeviceSignalConfig.isKindToggled(ctx, kind));
        }
        JSObject ret = new JSObject();
        ret.put("master", DeviceSignalConfig.isMasterOn(ctx));
        ret.put("enabled", enabled);
        ret.put("activityPermission", DeviceSensorSampler.hasActivityPermission(ctx));
        ret.put("stepSensor", collector.sensors().hasStepSensor());
        ret.put("lightSensor", collector.sensors().hasLightSensor());
        ret.put("notificationAccess", NotificationManagerCompat
            .getEnabledListenerPackages(ctx).contains(ctx.getPackageName()));
        ret.put("locationPermission", ContextCompat.checkSelfPermission(ctx,
            Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED);
        ret.put("queueSize", DeviceSignalQueue.size(ctx));
        ret.put("bootRestartWanted", BootRestartState.isWanted(ctx));
        ret.put("bootRestartResult", BootRestartState.lastResult(ctx));
        ret.put("backgroundLocation", BootRestartState.hasBackgroundLocation(ctx));
        String ssid = collector.currentSsid();
        ret.put("wifiConnected", ssid != null);
        ret.put("wifiLabel", ssid == null ? null : DeviceSignalConfig.wifiLabelFor(ctx, ssid));
        call.resolve(ret);
    }

    @PluginMethod
    public void setMaster(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        DeviceSignalConfig.setMaster(getContext(), on);
        DeviceSignalCollector.get(getContext()).reconfigure();
        call.resolve();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        String kind = call.getString("kind");
        if (!DeviceSignalConfig.isKnownKind(kind)) {
            call.reject("UNKNOWN_KIND");
            return;
        }
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        DeviceSignalConfig.setEnabled(getContext(), kind, on);
        DeviceSignalCollector.get(getContext()).reconfigure();
        call.resolve();
    }

    @PluginMethod
    public void requestActivityPermission(PluginCall call) {
        if (DeviceSensorSampler.hasActivityPermission(getContext())) {
            resolveActivity(call);
            return;
        }
        requestPermissionForAlias("activity", call, "activityPermissionCallback");
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        DeviceSignalCollector.get(getContext()).reconfigure();
        resolveActivity(call);
    }

    private void resolveActivity(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", DeviceSensorSampler.hasActivityPermission(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        openSettings(call, Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        openSettings(call, Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    }

    private void openSettings(PluginCall call, String action) {
        try {
            Intent intent = new Intent(action);
            if (Settings.ACTION_APPLICATION_DETAILS_SETTINGS.equals(action)) {
                intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("SETTINGS_UNAVAILABLE", e);
        }
    }

    /** Labels the currently connected Wi-Fi (home / work / other, or null to clear). */
    @PluginMethod
    public void labelCurrentWifi(PluginCall call) {
        DeviceSignalCollector collector = DeviceSignalCollector.get(getContext());
        String ssid = collector.currentSsid();
        if (ssid == null) {
            call.reject("WIFI_UNAVAILABLE");
            return;
        }
        String label = call.getString("label");
        if (label != null && !label.equals("home") && !label.equals("work") && !label.equals("other")) {
            call.reject("INVALID_LABEL");
            return;
        }
        DeviceSignalConfig.setWifiLabel(getContext(), ssid, label);
        collector.refreshNetwork();
        call.resolve();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        Integer max = call.getInt("max", 400);
        int limit = Math.max(1, Math.min(max == null ? 400 : max, 1000));
        NotificationCountListener.flush(getContext());
        JSObject ret = new JSObject();
        ret.put("events", DeviceSignalQueue.peek(getContext(), limit));
        ret.put("remaining", DeviceSignalQueue.size(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void ack(PluginCall call) {
        Long upTo = call.getLong("upToId");
        if (upTo == null) {
            call.reject("MISSING_ID");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("remaining", DeviceSignalQueue.ack(getContext(), upTo));
        call.resolve(ret);
    }
}
