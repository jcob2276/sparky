package app.vanguard.os;

import android.content.Context;
import android.net.TrafficStats;

import com.getcapacitor.JSObject;

/** Byte-count deltas (mobile + total) since the previous sample; counters reset on reboot. */
final class DeviceTrafficSampler {

    private DeviceTrafficSampler() {}

    static void sample(Context app) {
        long now = System.currentTimeMillis();
        long[] cur = {
            TrafficStats.getMobileRxBytes(), TrafficStats.getMobileTxBytes(),
            TrafficStats.getTotalRxBytes(), TrafficStats.getTotalTxBytes(),
        };
        for (long v : cur) if (v == TrafficStats.UNSUPPORTED) return;
        android.content.SharedPreferences prefs = DeviceSignalConfig.prefs(app);
        String[] keys = {"tr_mrx", "tr_mtx", "tr_trx", "tr_ttx"};
        boolean hasBaseline = prefs.contains(keys[0]);
        long[] delta = new long[4];
        android.content.SharedPreferences.Editor ed = prefs.edit();
        for (int i = 0; i < 4; i++) {
            long last = prefs.getLong(keys[i], 0L);
            delta[i] = cur[i] >= last ? cur[i] - last : cur[i];
            ed.putLong(keys[i], cur[i]);
        }
        ed.apply();
        if (!hasBaseline || (delta[0] + delta[1] + delta[2] + delta[3]) <= 0L) return;
        JSObject p = new JSObject();
        p.put("mrx", delta[0]);
        p.put("mtx", delta[1]);
        p.put("trx", delta[2]);
        p.put("ttx", delta[3]);
        DeviceSignalQueue.add(app, "traffic", now, p);
    }
}
