package app.vanguard.os;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;

/**
 * Battery-cheap sensor collectors: step counter (hardware-batched, 5 min latency) and
 * ambient light (a single reading every 5 min, only while the screen is on).
 */
final class DeviceSensorSampler {

    private static final long STEP_BATCH_LATENCY_US = 300_000_000L;
    private static final int STEP_EMIT_MIN = 100;
    private static final long STEP_EMIT_MAX_AGE_MS = 15 * 60_000L;
    private static final long STEP_BASELINE_MAX_GAP_MS = 6 * 3600_000L;
    private static final long LIGHT_INTERVAL_MS = 5 * 60_000L;
    private static final long LIGHT_TIMEOUT_MS = 10_000L;
    private static final String KEY_STEP_LAST = "steps_last_counter";
    private static final String KEY_STEP_LAST_AT = "steps_last_at";

    private final Context app;
    private final Handler handler;
    private final SensorManager sensors;
    private boolean stepsRegistered;
    private boolean lightEnabled;
    private boolean lightListening;
    private boolean screenOn;
    private long stepPending;
    private long stepLastEmitAt;

    DeviceSensorSampler(Context app, Handler handler) {
        this.app = app;
        this.handler = handler;
        this.sensors = (SensorManager) app.getSystemService(Context.SENSOR_SERVICE);
    }

    boolean hasStepSensor() {
        return sensors != null && sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
    }

    boolean hasLightSensor() {
        return sensors != null && sensors.getDefaultSensor(Sensor.TYPE_LIGHT) != null;
    }

    static boolean hasActivityPermission(Context ctx) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION)
                == PackageManager.PERMISSION_GRANTED;
    }

    // ---- steps ----

    void setStepsEnabled(boolean on) {
        if (sensors == null) return;
        Sensor sensor = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (on && !stepsRegistered && sensor != null && hasActivityPermission(app)) {
            stepsRegistered = sensors.registerListener(
                stepListener, sensor, SensorManager.SENSOR_DELAY_NORMAL, (int) STEP_BATCH_LATENCY_US);
        } else if (!on && stepsRegistered) {
            flushSteps(true);
            sensors.unregisterListener(stepListener);
            stepsRegistered = false;
        }
    }

    private final SensorEventListener stepListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event.values == null || event.values.length == 0) return;
            handleStepCounter((long) event.values[0]);
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    private void handleStepCounter(long counter) {
        SharedPreferences prefs = DeviceSignalConfig.prefs(app);
        long now = System.currentTimeMillis();
        long last = prefs.getLong(KEY_STEP_LAST, -1L);
        long lastAt = prefs.getLong(KEY_STEP_LAST_AT, 0L);
        long delta = 0L;
        if (last >= 0L && now - lastAt <= STEP_BASELINE_MAX_GAP_MS) {
            // counter restarts from 0 after a reboot
            delta = counter >= last ? counter - last : counter;
        }
        prefs.edit().putLong(KEY_STEP_LAST, counter).putLong(KEY_STEP_LAST_AT, now).apply();
        stepPending += delta;
        flushSteps(false);
    }

    private void flushSteps(boolean force) {
        if (stepPending <= 0L) return;
        long now = System.currentTimeMillis();
        if (stepLastEmitAt == 0L) stepLastEmitAt = now;
        if (!force && stepPending < STEP_EMIT_MIN && now - stepLastEmitAt < STEP_EMIT_MAX_AGE_MS) return;
        JSObject p = new JSObject();
        p.put("d", stepPending);
        DeviceSignalQueue.add(app, "steps", now, p);
        stepPending = 0L;
        stepLastEmitAt = now;
    }

    // ---- ambient light + brightness ----

    void setLightEnabled(boolean on) {
        lightEnabled = on;
        if (!on) {
            handler.removeCallbacks(lightSampleRunnable);
            stopLightListening();
        } else if (screenOn) {
            handler.removeCallbacks(lightSampleRunnable);
            handler.postDelayed(lightSampleRunnable, 2_000L);
        }
    }

    void onScreen(boolean on) {
        screenOn = on;
        if (!lightEnabled) return;
        handler.removeCallbacks(lightSampleRunnable);
        if (on) {
            handler.postDelayed(lightSampleRunnable, 2_000L);
        } else {
            stopLightListening();
        }
    }

    private final Runnable lightSampleRunnable = new Runnable() {
        @Override
        public void run() {
            if (!lightEnabled || !screenOn || sensors == null || lightListening) return;
            Sensor light = sensors.getDefaultSensor(Sensor.TYPE_LIGHT);
            if (light == null) return;
            lightListening = sensors.registerListener(lightListener, light, SensorManager.SENSOR_DELAY_NORMAL);
            handler.postDelayed(lightTimeoutRunnable, LIGHT_TIMEOUT_MS);
        }
    };

    private final Runnable lightTimeoutRunnable = new Runnable() {
        @Override
        public void run() {
            stopLightListening();
            rescheduleLight();
        }
    };

    private final SensorEventListener lightListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event.values == null || event.values.length == 0) return;
            JSObject p = new JSObject();
            p.put("lux", Math.round(event.values[0]));
            p.put("br", readInt(Settings.System.SCREEN_BRIGHTNESS));
            p.put("auto", readInt(Settings.System.SCREEN_BRIGHTNESS_MODE) == 1);
            DeviceSignalQueue.add(app, "light", System.currentTimeMillis(), p);
            handler.removeCallbacks(lightTimeoutRunnable);
            stopLightListening();
            rescheduleLight();
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    private void rescheduleLight() {
        handler.removeCallbacks(lightSampleRunnable);
        if (lightEnabled && screenOn) handler.postDelayed(lightSampleRunnable, LIGHT_INTERVAL_MS);
    }

    private void stopLightListening() {
        if (lightListening && sensors != null) {
            sensors.unregisterListener(lightListener);
        }
        lightListening = false;
    }

    private int readInt(String name) {
        return Settings.System.getInt(app.getContentResolver(), name, -1);
    }

    /** Periodic housekeeping: emit stale step batches. */
    void onTick() {
        flushSteps(false);
    }

    void stopAll() {
        handler.removeCallbacks(lightSampleRunnable);
        handler.removeCallbacks(lightTimeoutRunnable);
        stopLightListening();
        setStepsEnabled(false);
        lightEnabled = false;
    }
}
