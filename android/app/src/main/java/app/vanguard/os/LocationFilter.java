package app.vanguard.os;

/**
 * Pure quality gate for location fixes (no Android deps, unit-testable).
 * Rejects imprecise, stale, mocked and physically impossible fixes.
 */
final class LocationFilter {

    static final float MAX_ACCURACY_M = 50f;
    /** Used only when no good fix was accepted for a long time (indoors, tunnels). */
    static final float RELAXED_ACCURACY_M = 100f;
    static final double MAX_SPEED_MPS = 70.0; // ~250 km/h
    static final long MAX_AGE_MS = 120_000L;
    static final long RELAX_AFTER_MS = 10L * 60L * 1000L;

    enum Verdict { ACCEPT, NO_ACCURACY, LOW_ACCURACY, MOCK, STALE, JUMP, INVALID }

    private LocationFilter() {}

    static Verdict evaluate(LocationFix fix, boolean mock, long nowMs, LocationFix lastAccepted,
                            long lastAcceptedAtMs) {
        if (fix == null || Double.isNaN(fix.lat) || Double.isNaN(fix.lng)
                || Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180
                || (fix.lat == 0.0 && fix.lng == 0.0)) {
            return Verdict.INVALID;
        }
        if (mock) return Verdict.MOCK;
        if (fix.timeMs > 0 && nowMs - fix.timeMs > MAX_AGE_MS) return Verdict.STALE;
        if (Float.isNaN(fix.accuracy) || fix.accuracy <= 0f) return Verdict.NO_ACCURACY;

        boolean relaxed = lastAccepted == null || nowMs - lastAcceptedAtMs > RELAX_AFTER_MS;
        float limit = relaxed ? RELAXED_ACCURACY_M : MAX_ACCURACY_M;
        if (fix.accuracy > limit) return Verdict.LOW_ACCURACY;

        if (lastAccepted != null && fix.timeMs > lastAccepted.timeMs) {
            double dtSec = Math.max(1.0, (fix.timeMs - lastAccepted.timeMs) / 1000.0);
            double dist = distanceMeters(lastAccepted.lat, lastAccepted.lng, fix.lat, fix.lng);
            // Subtract both accuracy radii: jitter inside the error circle is not a jump.
            double effective = Math.max(0.0, dist - lastAccepted.accuracy - fix.accuracy);
            if (effective / dtSec > MAX_SPEED_MPS) return Verdict.JUMP;
        }
        return Verdict.ACCEPT;
    }

    static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        final double r = 6371000.0;
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dp = Math.toRadians(lat2 - lat1);
        double dl = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
