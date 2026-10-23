package app.vanguard.os;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;

/**
 * Process-wide owner of the lightweight phone signal collectors (battery, network, screen, DND,
 * audio route, traffic). Collectors are event-driven callbacks - no polling except one 15 min
 * housekeeping tick. Events go to {@link DeviceSignalQueue}; sensors live in {@link DeviceSensorSampler}.
 * The process is kept alive by the telemetry foreground service or the notification listener.
 */
final class DeviceSignalCollector {

    private static final long TICK_MS = 15 * 60_000L;
    private static final long TRAFFIC_MIN_GAP_MS = 29 * 60_000L;
    private static final int BATTERY_STEP_PCT = 5;
    private static DeviceSignalCollector instance;

    private final Context app;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final DeviceSensorSampler sampler;
    private boolean started;
    private BroadcastReceiver screenReceiver;
    private BroadcastReceiver batteryReceiver;
    private BroadcastReceiver dndReceiver;
    private AudioDeviceCallback audioCallback;
    private final DeviceNetworkTracker network;
    private String lastAudio = "";
    private int lastDnd = -1;
    private int lastBatteryLevel = -100;
    private int lastBatteryPlug = -1;
    private boolean lastPowerSave;
    private long lastTrafficAt;

    private DeviceSignalCollector(Context ctx) {
        this.app = ctx.getApplicationContext();
        this.sampler = new DeviceSensorSampler(app, handler);
        this.network = new DeviceNetworkTracker(app, handler);
    }

    static synchronized DeviceSignalCollector get(Context ctx) {
        if (instance == null) instance = new DeviceSignalCollector(ctx);
        return instance;
    }

    DeviceSensorSampler sensors() {
        return sampler;
    }

    synchronized void start() {
        if (!started) {
            started = true;
            handler.postDelayed(tickRunnable, TICK_MS);
        }
        reconfigure();
    }

    synchronized void stop() {
        handler.removeCallbacksAndMessages(null);
        unregisterAll();
        sampler.stopAll();
        started = false;
    }

    /** Re-applies toggles: registers enabled collectors, unregisters disabled ones. */
    synchronized void reconfigure() {
        if (!started) return;
        if (!DeviceSignalConfig.isMasterOn(app)) {
            unregisterAll();
            sampler.stopAll();
            return;
        }
        syncScreen(DeviceSignalConfig.isEnabled(app, "screen") || DeviceSignalConfig.isEnabled(app, "light"));
        syncBattery(DeviceSignalConfig.isEnabled(app, "battery"));
        syncDnd(DeviceSignalConfig.isEnabled(app, "dnd"));
        syncAudio(DeviceSignalConfig.isEnabled(app, "audio"));
        network.sync(DeviceSignalConfig.isEnabled(app, "network"));
        sampler.setStepsEnabled(DeviceSignalConfig.isEnabled(app, "steps"));
        sampler.setLightEnabled(DeviceSignalConfig.isEnabled(app, "light"));
    }

    void refreshNetwork() {
        network.refresh();
    }

    String currentSsid() {
        return network.currentSsid();
    }

    private final Runnable tickRunnable = new Runnable() {
        @Override
        public void run() {
            sampler.onTick();
            NotificationCountListener.flush(app);
            if (DeviceSignalConfig.isEnabled(app, "traffic") && trafficDue()) DeviceTrafficSampler.sample(app);
            if (batteryReceiver != null) sampleBattery();
            handler.postDelayed(this, TICK_MS);
        }
    };

    private boolean trafficDue() {
        long now = System.currentTimeMillis();
        if (now - lastTrafficAt < TRAFFIC_MIN_GAP_MS) return false;
        lastTrafficAt = now;
        return true;
    }

    private void unregisterAll() {
        syncScreen(false);
        syncBattery(false);
        syncDnd(false);
        syncAudio(false);
        network.sync(false);
    }

    private void record(String kind, JSObject payload) {
        DeviceSignalQueue.add(app, kind, System.currentTimeMillis(), payload);
    }

    // ---- screen / unlock ----

    private void syncScreen(boolean on) {
        if (on && screenReceiver == null) {
            screenReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if (action == null) return;
                    boolean wantsScreen = DeviceSignalConfig.isEnabled(app, "screen");
                    if (Intent.ACTION_USER_PRESENT.equals(action)) {
                        if (wantsScreen) record("unlock", new JSObject());
                        return;
                    }
                    boolean screenOn = Intent.ACTION_SCREEN_ON.equals(action);
                    if (wantsScreen) {
                        JSObject p = new JSObject();
                        p.put("on", screenOn);
                        record("screen", p);
                    }
                    sampler.onScreen(screenOn);
                }
            };
            IntentFilter f = new IntentFilter();
            f.addAction(Intent.ACTION_SCREEN_ON);
            f.addAction(Intent.ACTION_SCREEN_OFF);
            f.addAction(Intent.ACTION_USER_PRESENT);
            ContextCompat.registerReceiver(app, screenReceiver, f, ContextCompat.RECEIVER_NOT_EXPORTED);
            PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE);
            sampler.onScreen(pm != null && pm.isInteractive());
        } else if (!on && screenReceiver != null) {
            safeUnregister(screenReceiver);
            screenReceiver = null;
        }
    }

    // ---- battery ----

    private void syncBattery(boolean on) {
        if (on && batteryReceiver == null) {
            batteryReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    sampleBattery();
                }
            };
            IntentFilter f = new IntentFilter();
            f.addAction(Intent.ACTION_BATTERY_CHANGED);
            f.addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
            ContextCompat.registerReceiver(app, batteryReceiver, f, ContextCompat.RECEIVER_NOT_EXPORTED);
        } else if (!on && batteryReceiver != null) {
            safeUnregister(batteryReceiver);
            batteryReceiver = null;
        }
    }

    private void sampleBattery() {
        Intent b = app.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (b == null) return;
        int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        if (level < 0 || scale <= 0) return;
        int pct = Math.round(level * 100f / scale);
        int plug = b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
        PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE);
        boolean saver = pm != null && pm.isPowerSaveMode();
        boolean changed = plug != lastBatteryPlug
            || saver != lastPowerSave
            || Math.abs(pct - lastBatteryLevel) >= BATTERY_STEP_PCT;
        if (!changed) return;
        lastBatteryLevel = pct;
        lastBatteryPlug = plug;
        lastPowerSave = saver;
        JSObject p = new JSObject();
        p.put("lvl", pct);
        p.put("chg", plug != 0);
        p.put("plug", plugName(plug));
        p.put("temp", b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0);
        p.put("ps", saver);
        record("battery", p);
    }

    private static String plugName(int plug) {
        if (plug == BatteryManager.BATTERY_PLUGGED_AC) return "ac";
        if (plug == BatteryManager.BATTERY_PLUGGED_USB) return "usb";
        if (plug == BatteryManager.BATTERY_PLUGGED_WIRELESS) return "wireless";
        return plug == 0 ? "none" : "other";
    }

    // ---- do not disturb ----

    private void syncDnd(boolean on) {
        if (on && dndReceiver == null) {
            dndReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    sampleDnd();
                }
            };
            ContextCompat.registerReceiver(app, dndReceiver,
                new IntentFilter(NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED),
                ContextCompat.RECEIVER_NOT_EXPORTED);
            sampleDnd();
        } else if (!on && dndReceiver != null) {
            safeUnregister(dndReceiver);
            dndReceiver = null;
        }
    }

    private void sampleDnd() {
        NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        int filter = nm.getCurrentInterruptionFilter();
        if (filter == lastDnd) return;
        lastDnd = filter;
        JSObject p = new JSObject();
        p.put("f", filterName(filter));
        record("dnd", p);
    }

    private static String filterName(int filter) {
        switch (filter) {
            case NotificationManager.INTERRUPTION_FILTER_ALL: return "all";
            case NotificationManager.INTERRUPTION_FILTER_PRIORITY: return "priority";
            case NotificationManager.INTERRUPTION_FILTER_ALARMS: return "alarms";
            case NotificationManager.INTERRUPTION_FILTER_NONE: return "none";
            default: return "unknown";
        }
    }

    // ---- audio route (type only; no device names, no Bluetooth permission needed) ----

    private void syncAudio(boolean on) {
        AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        if (on && audioCallback == null) {
            audioCallback = new AudioDeviceCallback() {
                @Override
                public void onAudioDevicesAdded(AudioDeviceInfo[] added) {
                    sampleAudio();
                }

                @Override
                public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) {
                    sampleAudio();
                }
            };
            am.registerAudioDeviceCallback(audioCallback, handler);
            sampleAudio();
        } else if (!on && audioCallback != null) {
            am.unregisterAudioDeviceCallback(audioCallback);
            audioCallback = null;
        }
    }

    private void sampleAudio() {
        AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        String route = "none";
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            int t = d.getType();
            boolean bt = t == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                || t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && t == AudioDeviceInfo.TYPE_BLE_HEADSET);
            boolean wired = t == AudioDeviceInfo.TYPE_WIRED_HEADSET
                || t == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
                || t == AudioDeviceInfo.TYPE_USB_HEADSET;
            if (bt) {
                route = "bt";
                break;
            }
            if (wired) route = "wired";
        }
        if (route.equals(lastAudio)) return;
        lastAudio = route;
        JSObject p = new JSObject();
        p.put("out", route);
        record("audio", p);
    }

    private void safeUnregister(BroadcastReceiver r) {
        try {
            app.unregisterReceiver(r);
        } catch (IllegalArgumentException ignored) {
            // not registered
        }
    }
}
