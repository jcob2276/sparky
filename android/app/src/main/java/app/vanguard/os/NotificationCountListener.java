package app.vanguard.os;

import android.app.Notification;
import android.content.Context;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import com.getcapacitor.JSObject;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Counts posted notifications per package (hourly windows). Privacy by construction: only the
 * package name is read - never title, text, extras or actions.
 */
public class NotificationCountListener extends NotificationListenerService {

    private static final long HOUR_MS = 3600_000L;
    private static final int MAX_SEEN = 400;
    private static final Object LOCK = new Object();
    private static final Map<String, Integer> COUNTS = new HashMap<>();
    private static final Map<String, Long> SEEN = new LinkedHashMap<String, Long>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
            return size() > MAX_SEEN;
        }
    };
    private static long windowStart = 0L;

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        // The system binds this service on its own, which also revives the collectors.
        DeviceSignalCollector.get(getApplicationContext()).start();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Context ctx = getApplicationContext();
        if (sbn == null || !DeviceSignalConfig.isEnabled(ctx, "notif")) return;
        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.equals(ctx.getPackageName()) || pkg.equals("android")) return;
        int flags = sbn.getNotification().flags;
        boolean noise = (flags & Notification.FLAG_ONGOING_EVENT) != 0
            || (flags & Notification.FLAG_GROUP_SUMMARY) != 0
            || (flags & Notification.FLAG_FOREGROUND_SERVICE) != 0;
        if (noise) return;

        long now = System.currentTimeMillis();
        long hour = now - (now % HOUR_MS);
        synchronized (LOCK) {
            if (hour != windowStart) {
                flushLocked(ctx);
                windowStart = hour;
            }
            // Updates of the same notification keep the key and postTime; count only new posts.
            String key = sbn.getKey();
            Long prev = SEEN.put(key, sbn.getPostTime());
            if (prev != null && prev == sbn.getPostTime()) return;
            Integer n = COUNTS.get(pkg);
            COUNTS.put(pkg, n == null ? 1 : n + 1);
        }
    }

    /** Writes the pending window to the queue (called by the periodic tick and before drains). */
    static void flush(Context ctx) {
        synchronized (LOCK) {
            flushLocked(ctx.getApplicationContext());
        }
    }

    private static void flushLocked(Context ctx) {
        if (COUNTS.isEmpty()) return;
        JSObject counts = new JSObject();
        int total = 0;
        for (Map.Entry<String, Integer> e : COUNTS.entrySet()) {
            counts.put(e.getKey(), e.getValue());
            total += e.getValue();
        }
        JSObject payload = new JSObject();
        payload.put("n", total);
        payload.put("c", counts);
        long ts = windowStart > 0L ? windowStart : System.currentTimeMillis();
        DeviceSignalQueue.add(ctx, "notif", ts, payload);
        COUNTS.clear();
    }
}
