package app.vanguard.os;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.TimeZone;
import org.junit.Test;

public class UsageBucketsTest {

    private static final TimeZone WARSAW = TimeZone.getTimeZone("Europe/Warsaw");
    private static final long MIN = 60_000L;

    // 2026-06-15 00:00 Warsaw (CEST, UTC+2) = 2026-06-14T22:00Z
    private static final long SUMMER_DAY = 1781474400000L;
    // 2026-03-29 (spring forward, 23h day): 00:00 CET = 2026-03-28T23:00Z
    private static final long SPRING_DAY = 1774738800000L;
    // 2026-10-25 (fall back, 25h day): 00:00 CEST = 2026-10-24T22:00Z
    private static final long FALL_DAY = 1792879200000L;

    @Test
    public void splitsSessionAcrossHalfHourBoundary() {
        long[] acc = new long[UsageBuckets.COUNT];
        UsageBuckets.add(acc, WARSAW, SUMMER_DAY + 21 * 60 * MIN + 20 * MIN, SUMMER_DAY + 21 * 60 * MIN + 40 * MIN);
        assertEquals(10 * MIN, acc[42]); // 21:00-21:30
        assertEquals(10 * MIN, acc[43]); // 21:30-22:00
    }

    @Test
    public void sessionAcrossMidnightLandsInLastAndFirstBucket() {
        long[] acc = new long[UsageBuckets.COUNT];
        UsageBuckets.add(acc, WARSAW, SUMMER_DAY + 23 * 60 * MIN + 45 * MIN, SUMMER_DAY + 24 * 60 * MIN + 15 * MIN);
        assertEquals(15 * MIN, acc[47]);
        assertEquals(15 * MIN, acc[0]);
    }

    @Test
    public void springForwardDayStaysInRange() {
        long[] acc = new long[UsageBuckets.COUNT];
        UsageBuckets.add(acc, WARSAW, SPRING_DAY, SPRING_DAY + 23 * 60 * MIN);
        long sum = 0;
        for (long v : acc) sum += v;
        assertEquals(23 * 60 * MIN, sum);
        assertEquals(0L, acc[4]); // 02:00-02:30 does not exist
    }

    @Test
    public void fallBackDayDoublesTheRepeatedHourAndIsCappedInMinutes() {
        long[] acc = new long[UsageBuckets.COUNT];
        UsageBuckets.add(acc, WARSAW, FALL_DAY, FALL_DAY + 25 * 60 * MIN);
        long sum = 0;
        for (long v : acc) sum += v;
        assertEquals(25 * 60 * MIN, sum);
        assertEquals(60 * MIN, acc[4]); // 02:00-02:30 occurs twice
        int[] minutes = UsageBuckets.toMinutes(acc, 25 * 60 * MIN);
        assertEquals(30, minutes[4]);
    }

    @Test
    public void minutesNeverExceedTotal() {
        long[] acc = new long[UsageBuckets.COUNT];
        for (int i = 0; i < 4; i++) acc[i] = 30 * MIN / 2 + 40_000L; // 15m40s each -> rounds to 16
        long total = 4 * (15 * MIN + 40_000L);
        int[] minutes = UsageBuckets.toMinutes(acc, total);
        int sum = 0;
        for (int m : minutes) sum += m;
        assertTrue(sum <= Math.round(total / (double) MIN));
    }
}
