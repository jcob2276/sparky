package app.vanguard.os;

import android.app.AppOpsManager;
import android.app.KeyguardManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    private static final TimeZone WARSAW = TimeZone.getTimeZone("Europe/Warsaw");
    private static final long MAX_SESSION_MS = 2 * 3600 * 1000L;
    private static final long MAX_DIALER_SESSION_MS = 2 * 60 * 1000L;
    private static final long PRE_ROLL_MS = 4 * 3600 * 1000L;

    private static final Set<String> SYSTEM_PACKAGES = new HashSet<>(Arrays.asList(
        "android",
        "com.android.systemui",
        "com.google.android.apps.nexuslauncher",
        "com.sec.android.app.launcher",
        "com.miui.home",
        "com.android.launcher3",
        "com.huawei.android.launcher",
        "com.oppo.launcher",
        "com.oneplus.launcher",
        "com.google.android.inputmethod.latin",
        "com.samsung.android.honeyboard",
        "com.touchtype.swiftkey",
        "com.android.permissioncontroller"
    ));

    private static final Set<String> DIALER_PACKAGES = new HashSet<>(Arrays.asList(
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "com.samsung.android.incallui",
        "com.android.incallui",
        "com.android.phone"
    ));

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasUsageAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getDailySnapshot(PluginCall call) {
        if (!hasUsageAccess()) {
            call.reject("USAGE_ACCESS_DENIED");
            return;
        }

        Long beginMs = call.getLong("beginMs");
        Long endMs = call.getLong("endMs");
        if (beginMs == null || endMs == null || endMs <= beginMs) {
            call.reject("INVALID_RANGE");
            return;
        }

        UsageStatsManager manager = (UsageStatsManager) getContext()
            .getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) {
            call.reject("USAGE_STATS_UNAVAILABLE");
            return;
        }

        long queryBeginMs = Math.max(0L, beginMs - PRE_ROLL_MS);
        UsageEvents events = manager.queryEvents(queryBeginMs, endMs);
        UsageEvents.Event event = new UsageEvents.Event();

        boolean isScreenInteractive = false;
        boolean isKeyguardHidden = false;
        String currentForegroundPkg = null;
        long sessionStartMs = 0L;
        int unlocks = 0;

        Map<String, Long> packageMs = new HashMap<>();
        long[] lateNightAcc = new long[] { 0L };

        while (events.hasNextEvent()) {
            events.getNextEvent(event);
            int type = event.getEventType();
            long ts = event.getTimeStamp();

            if (type == UsageEvents.Event.KEYGUARD_HIDDEN) {
                if (ts >= beginMs && ts <= endMs) {
                    unlocks++;
                }
                isKeyguardHidden = true;
                if (isScreenInteractive && currentForegroundPkg != null && sessionStartMs == 0L) {
                    sessionStartMs = ts;
                }
            } else if (type == UsageEvents.Event.KEYGUARD_SHOWN) {
                if (sessionStartMs > 0L) {
                    recordSession(currentForegroundPkg, sessionStartMs, ts, beginMs, endMs, packageMs, lateNightAcc);
                    sessionStartMs = 0L;
                }
                isKeyguardHidden = false;
            } else if (type == UsageEvents.Event.SCREEN_INTERACTIVE) {
                isScreenInteractive = true;
                if (isKeyguardHidden && currentForegroundPkg != null && sessionStartMs == 0L) {
                    sessionStartMs = ts;
                }
            } else if (type == UsageEvents.Event.SCREEN_NON_INTERACTIVE) {
                if (sessionStartMs > 0L) {
                    recordSession(currentForegroundPkg, sessionStartMs, ts, beginMs, endMs, packageMs, lateNightAcc);
                    sessionStartMs = 0L;
                }
                isScreenInteractive = false;
            } else if (type == UsageEvents.Event.ACTIVITY_RESUMED
                || type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                String newPkg = event.getPackageName();
                if (sessionStartMs > 0L) {
                    recordSession(currentForegroundPkg, sessionStartMs, ts, beginMs, endMs, packageMs, lateNightAcc);
                    sessionStartMs = 0L;
                }
                currentForegroundPkg = newPkg;
                if (isScreenInteractive && isKeyguardHidden) {
                    sessionStartMs = ts;
                }
            } else if (type == UsageEvents.Event.ACTIVITY_PAUSED
                || type == UsageEvents.Event.ACTIVITY_STOPPED
                || type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                String pkg = event.getPackageName();
                if (pkg != null && pkg.equals(currentForegroundPkg)) {
                    if (sessionStartMs > 0L) {
                        recordSession(currentForegroundPkg, sessionStartMs, ts, beginMs, endMs, packageMs, lateNightAcc);
                        sessionStartMs = 0L;
                    }
                    currentForegroundPkg = null;
                }
            } else if (type == UsageEvents.Event.DEVICE_SHUTDOWN) {
                if (sessionStartMs > 0L) {
                    recordSession(currentForegroundPkg, sessionStartMs, ts, beginMs, endMs, packageMs, lateNightAcc);
                    sessionStartMs = 0L;
                }
                isScreenInteractive = false;
                isKeyguardHidden = false;
                currentForegroundPkg = null;
            }
        }

        // Tail validation against instantaneous device power and keyguard state
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (pm != null && !pm.isInteractive()) {
            isScreenInteractive = false;
        }
        if (km != null && km.isKeyguardLocked()) {
            isKeyguardHidden = false;
        }

        if (sessionStartMs > 0L && currentForegroundPkg != null && isScreenInteractive && isKeyguardHidden) {
            long safeEnd = Math.min(endMs, sessionStartMs + MAX_SESSION_MS);
            recordSession(currentForegroundPkg, sessionStartMs, safeEnd, beginMs, endMs, packageMs, lateNightAcc);
        }

        // Fallback to queryUsageStats if event log is completely empty
        if (packageMs.isEmpty()) {
            List<UsageStats> statsList = manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, beginMs, endMs);
            if (statsList != null) {
                for (UsageStats stats : statsList) {
                    String pkg = stats.getPackageName();
                    long timeInFg = stats.getTotalTimeInForeground();
                    if (timeInFg > 0L && !isSystemPackage(pkg)) {
                        if (isDialerPackage(pkg)) {
                            timeInFg = Math.min(timeInFg, MAX_DIALER_SESSION_MS);
                        }
                        packageMs.put(pkg, timeInFg);
                    }
                }
            }
        }

        long totalForegroundMs = 0L;
        JSArray packages = new JSArray();
        for (Map.Entry<String, Long> entry : packageMs.entrySet()) {
            if (entry.getValue() <= 0L) continue;
            totalForegroundMs += entry.getValue();
            JSObject row = new JSObject();
            row.put("packageName", entry.getKey());
            row.put("foregroundMs", entry.getValue());
            packages.put(row);
        }

        long safeLateNightMs = Math.min(lateNightAcc[0], totalForegroundMs);

        JSObject ret = new JSObject();
        ret.put("packages", packages);
        ret.put("unlocks", unlocks);
        ret.put("lateNightMs", safeLateNightMs);
        ret.put("totalForegroundMs", totalForegroundMs);
        call.resolve(ret);
    }

    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private boolean isSystemPackage(String pkg) {
        return pkg != null && SYSTEM_PACKAGES.contains(pkg.toLowerCase());
    }

    private boolean isDialerPackage(String pkg) {
        return pkg != null && DIALER_PACKAGES.contains(pkg.toLowerCase());
    }

    private void recordSession(
        String pkg,
        long sessionStart,
        long sessionEnd,
        long beginMs,
        long endMs,
        Map<String, Long> packageMs,
        long[] lateNightAcc
    ) {
        if (pkg == null || isSystemPackage(pkg)) return;

        long effectiveStart = Math.max(sessionStart, beginMs);
        long effectiveEnd = Math.min(sessionEnd, endMs);
        if (effectiveEnd <= effectiveStart) return;

        long duration = effectiveEnd - effectiveStart;
        if (duration > MAX_SESSION_MS) {
            duration = MAX_SESSION_MS;
            effectiveEnd = effectiveStart + duration;
        }

        if (isDialerPackage(pkg) && duration > MAX_DIALER_SESSION_MS) {
            duration = MAX_DIALER_SESSION_MS;
            effectiveEnd = effectiveStart + duration;
        }

        packageMs.put(pkg, packageMs.getOrDefault(pkg, 0L) + duration);

        long late = calculateLateNightOverlap(effectiveStart, effectiveEnd);
        lateNightAcc[0] += late;
    }

    private long calculateLateNightOverlap(long startMs, long endMs) {
        if (endMs <= startMs) return 0L;
        long lateMs = 0L;
        Calendar cal = Calendar.getInstance(WARSAW);
        long step = 60_000L;
        long cur = startMs;
        while (cur < endMs) {
            long next = Math.min(cur + step, endMs);
            cal.setTimeInMillis(cur + (next - cur) / 2);
            int hour = cal.get(Calendar.HOUR_OF_DAY);
            if (hour >= 23 || hour < 4) {
                lateMs += (next - cur);
            }
            cur = next;
        }
        return lateMs;
    }
}
