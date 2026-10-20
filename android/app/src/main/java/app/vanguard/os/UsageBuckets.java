package app.vanguard.os;

import java.util.TimeZone;

/**
 * Half-hour foreground buckets of a local (Europe/Warsaw) day.
 * Index 0 = 00:00-00:30 wall-clock, index 47 = 23:30-24:00. Bucketing is by local wall-clock
 * time, so on DST days (23h / 25h) the repeated or missing hour shares / lacks its buckets.
 */
final class UsageBuckets {

    static final int COUNT = 48;
    static final long BUCKET_MS = 30L * 60_000L;
    static final long DAY_MS = 24L * 3600_000L;
    private static final long MINUTE_MS = 60_000L;

    private UsageBuckets() {}

    /** Adds [startMs, endMs) to acc, splitting at local half-hour boundaries. */
    static void add(long[] acc, TimeZone tz, long startMs, long endMs) {
        long cur = startMs;
        while (cur < endMs) {
            long local = cur + tz.getOffset(cur);
            long inDay = Math.floorMod(local, DAY_MS);
            int idx = (int) (inDay / BUCKET_MS);
            long segEnd = Math.min(endMs, cur + (BUCKET_MS - (inDay % BUCKET_MS)));
            acc[idx] += segEnd - cur;
            cur = segEnd;
        }
    }

    /**
     * Converts ms to whole minutes per bucket: rounded, capped at 30, and trimmed so the
     * sum never exceeds the day's total whole minutes.
     */
    static int[] toMinutes(long[] acc, long totalForegroundMs) {
        int[] out = new int[COUNT];
        int sum = 0;
        for (int i = 0; i < COUNT; i++) {
            long m = Math.round(acc[i] / (double) MINUTE_MS);
            out[i] = (int) Math.min(30L, Math.max(0L, m));
            sum += out[i];
        }
        long totalMin = Math.round(totalForegroundMs / (double) MINUTE_MS);
        while (sum > totalMin) {
            int pick = -1;
            for (int i = 0; i < COUNT; i++) {
                if (out[i] <= 0) continue;
                // prefer the bucket that was rounded up the most
                if (pick < 0 || (acc[i] % MINUTE_MS) < (acc[pick] % MINUTE_MS)) pick = i;
            }
            if (pick < 0) break;
            out[pick]--;
            sum--;
        }
        return out;
    }
}
