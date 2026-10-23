package app.vanguard.os;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class LocationLogicTest {

    private static LocationFix fix(double lat, double lng, float acc, long t) {
        return new LocationFix(lat, lng, acc, t, Float.NaN, Float.NaN, Double.NaN, "fused");
    }

    @Test
    public void rejectsImpreciseMockStaleAndJumps() {
        long now = 1_000_000_000L;
        LocationFix base = fix(50.0413, 21.999, 10f, now - 5_000);
        assertEquals(LocationFilter.Verdict.ACCEPT,
            LocationFilter.evaluate(base, false, now, null, 0));
        assertEquals(LocationFilter.Verdict.MOCK,
            LocationFilter.evaluate(base, true, now, null, 0));
        assertEquals(LocationFilter.Verdict.STALE,
            LocationFilter.evaluate(fix(50.0413, 21.999, 10f, now - 300_000), false, now, null, 0));
        assertEquals(LocationFilter.Verdict.LOW_ACCURACY,
            LocationFilter.evaluate(fix(50.0413, 21.999, 80f, now), false, now, base, now - 1000));
        // 100 km in 5 s
        assertEquals(LocationFilter.Verdict.JUMP,
            LocationFilter.evaluate(fix(51.0, 21.999, 10f, now), false, now, base, now - 5000));
    }

    @Test
    public void emitsVisitAfterDwellAndDeparture() {
        final List<String> events = new ArrayList<>();
        VisitTracker t = new VisitTracker(new VisitTracker.Sink() {
            public void point(LocationFix f) { events.add("p"); }
            public void visit(LocationFix c, long a, long d) { events.add("v:" + (d - a) / 60000); }
        });
        long t0 = 0;
        for (int i = 0; i <= 12; i++) t.onFix(fix(50.0, 21.0, 20f, t0 + i * 60_000L));
        assertEquals(VisitTracker.Mode.STATIONARY, t.mode());
        // two consecutive far fixes = departure
        t.onFix(fix(50.01, 21.0, 20f, 13 * 60_000L));
        t.onFix(fix(50.011, 21.0, 20f, 14 * 60_000L));
        assertTrue(events.toString(), events.contains("v:12"));
        assertEquals(VisitTracker.Mode.MOVING, t.mode());
    }
}
