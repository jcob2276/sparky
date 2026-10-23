package app.vanguard.os;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.util.List;

/**
 * Fused-provider collector owned by {@link TelemetryForegroundService}.
 * Adaptive: HIGH_ACCURACY every ~10 s while moving, BALANCED every ~2 min when stationary.
 * Every fix passes {@link LocationFilter}; survivors go through {@link VisitTracker} into the
 * durable {@link LocationQueueStore}, which the web layer uploads (offline-safe, retried).
 */
final class LocationCollector {

    interface QueueListener {
        void onQueued(int pending);
    }

    private static final String TAG = "LocationCollector";
    private static final String PREFS = "location_collector";
    private static final String KEY_VISIT = "open_visit";
    private static final long NOTIFY_THROTTLE_MS = 45_000L;
    private static final long WATCHDOG_STALE_MS = 10L * 60L * 1000L;
    private static final int JUMPS_BEFORE_RESET = 3;

    // Cheap shared diagnostics for the Settings status card (same process).
    static volatile boolean running;
    static volatile long lastFixAtMs;
    static volatile float lastFixAccuracy = Float.NaN;
    static volatile String lastRejectReason = "";
    static volatile int acceptedCount;
    static volatile int rejectedCount;
    static volatile String modeName = "MOVING";
    static volatile QueueListener listener;

    private final Context ctx;
    private final FusedLocationProviderClient client;
    private final LocationQueueStore store;
    private final SharedPreferences prefs;
    private final VisitTracker tracker;

    private LocationFix lastAccepted;
    private long lastAcceptedAtMs;
    private int consecutiveJumps;
    private long lastCallbackAtMs;
    private long lastNotifyAtMs;
    private VisitTracker.Mode requestedMode;

    private final LocationCallback callback = new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult result) {
            lastCallbackAtMs = System.currentTimeMillis();
            List<Location> all = result.getLocations();
            for (Location loc : all) handle(loc);
        }
    };

    LocationCollector(Context context) {
        this.ctx = context.getApplicationContext();
        this.client = LocationServices.getFusedLocationProviderClient(ctx);
        this.store = LocationQueueStore.get(ctx);
        this.prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.tracker = new VisitTracker(new VisitTracker.Sink() {
            @Override
            public void point(LocationFix fix) {
                store.insert("point", fix, fix.timeMs, 0);
                notifyQueued();
            }

            @Override
            public void visit(LocationFix center, long arrivalMs, long departMs) {
                int dwell = (int) Math.max(0L, (departMs - arrivalMs) / 1000L);
                store.insert("visit", center, arrivalMs, dwell);
                notifyQueued();
            }
        });
    }

    static boolean hasLocationPermission(Context c) {
        return ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** Idempotent. Returns false when permission is missing (service should not request updates). */
    @SuppressWarnings("MissingPermission")
    synchronized boolean start() {
        if (!hasLocationPermission(ctx)) return false;
        if (running) return true;
        // A previous process may have died mid-stay: report that visit now.
        VisitTracker.closeSerialized(prefs.getString(KEY_VISIT, ""), new VisitTracker.Sink() {
            @Override public void point(LocationFix fix) { /* unused */ }
            @Override public void visit(LocationFix center, long a, long d) {
                store.insert("visit", center, a, (int) Math.max(0L, (d - a) / 1000L));
            }
        });
        prefs.edit().remove(KEY_VISIT).apply();
        store.trim();
        requestUpdates(VisitTracker.Mode.MOVING);
        running = true;
        lastCallbackAtMs = System.currentTimeMillis();
        return true;
    }

    synchronized void stop() {
        if (!running) return;
        client.removeLocationUpdates(callback);
        tracker.flush();
        prefs.edit().remove(KEY_VISIT).apply();
        running = false;
        requestedMode = null;
    }

    /** Called from the periodic tick: re-arm updates if the OS silently dropped them. */
    @SuppressWarnings("MissingPermission")
    synchronized void ensureAlive() {
        if (!running || !hasLocationPermission(ctx)) return;
        long silence = System.currentTimeMillis() - lastCallbackAtMs;
        if (silence > WATCHDOG_STALE_MS) {
            Log.w(TAG, "No location callbacks for " + silence + " ms, re-registering");
            VisitTracker.Mode m = requestedMode == null ? VisitTracker.Mode.MOVING : requestedMode;
            requestedMode = null;
            requestUpdates(m);
            lastCallbackAtMs = System.currentTimeMillis();
        }
    }

    @SuppressWarnings("MissingPermission")
    private void requestUpdates(VisitTracker.Mode mode) {
        if (mode == requestedMode) return;
        LocationRequest req;
        if (mode == VisitTracker.Mode.MOVING) {
            req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L)
                    .setMinUpdateIntervalMillis(5_000L)
                    .setMinUpdateDistanceMeters(5f)
                    .setWaitForAccurateLocation(false)
                    .build();
        } else {
            req = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 120_000L)
                    .setMinUpdateIntervalMillis(60_000L)
                    .setMinUpdateDistanceMeters(0f)
                    .build();
        }
        try {
            client.removeLocationUpdates(callback);
            client.requestLocationUpdates(req, callback, Looper.getMainLooper());
            requestedMode = mode;
            modeName = mode.name();
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission revoked", e);
        }
    }

    private void handle(Location loc) {
        long now = System.currentTimeMillis();
        long ageMs = Math.max(0L,
                (SystemClock.elapsedRealtimeNanos() - loc.getElapsedRealtimeNanos()) / 1_000_000L);
        LocationFix fix = new LocationFix(
                loc.getLatitude(), loc.getLongitude(),
                loc.hasAccuracy() ? loc.getAccuracy() : Float.NaN,
                now - ageMs,
                loc.hasSpeed() ? loc.getSpeed() : Float.NaN,
                loc.hasBearing() ? loc.getBearing() : Float.NaN,
                loc.hasAltitude() ? loc.getAltitude() : Double.NaN,
                loc.getProvider());

        boolean mock = Build.VERSION.SDK_INT >= 31 ? loc.isMock() : loc.isFromMockProvider();
        LocationFilter.Verdict v = LocationFilter.evaluate(fix, mock, now, lastAccepted, lastAcceptedAtMs);

        if (v == LocationFilter.Verdict.JUMP) {
            consecutiveJumps++;
            if (consecutiveJumps >= JUMPS_BEFORE_RESET) {
                // Repeated "jumps" that agree with each other = we really moved (flight, GPS outage).
                v = LocationFilter.evaluate(fix, mock, now, null, 0L);
            }
        } else {
            consecutiveJumps = 0;
        }

        if (v != LocationFilter.Verdict.ACCEPT) {
            rejectedCount++;
            lastRejectReason = v.name();
            return;
        }

        consecutiveJumps = 0;
        lastAccepted = fix;
        lastAcceptedAtMs = now;
        acceptedCount++;
        lastFixAtMs = fix.timeMs;
        lastFixAccuracy = fix.accuracy;

        boolean modeChanged = tracker.onFix(fix);
        if (modeChanged) requestUpdates(tracker.mode());
        prefs.edit().putString(KEY_VISIT, tracker.serialize()).apply();
    }

    private void notifyQueued() {
        long now = System.currentTimeMillis();
        QueueListener l = listener;
        if (l == null || now - lastNotifyAtMs < NOTIFY_THROTTLE_MS) return;
        lastNotifyAtMs = now;
        l.onQueued(store.count());
    }
}
