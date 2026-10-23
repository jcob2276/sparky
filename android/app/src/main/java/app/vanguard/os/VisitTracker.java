package app.vanguard.os;

/**
 * Pure motion / dwell state machine (no Android deps).
 * Consumes already-filtered fixes and decides which ones to persist:
 *  - MOVING: a point every ~25 m (or 60 s) so tracks are smooth,
 *  - STATIONARY: one heartbeat point per 15 min plus a single "visit" row on departure.
 */
final class VisitTracker {

    enum Mode { MOVING, STATIONARY }

    interface Sink {
        void point(LocationFix fix);
        /** arrivalMs/departMs bracket the stay; fix is the averaged centre of the cluster. */
        void visit(LocationFix center, long arrivalMs, long departMs);
    }

    static final long ARRIVE_MS = 3L * 60L * 1000L;
    static final long MIN_VISIT_MS = 5L * 60L * 1000L;
    static final long HEARTBEAT_MS = 15L * 60L * 1000L;
    static final long MOVING_EMIT_MS = 60L * 1000L;
    static final double MOVING_EMIT_DIST_M = 25.0;
    static final float WALKING_SPEED_MPS = 2.5f;

    private final Sink sink;
    private Mode mode = Mode.MOVING;

    private boolean hasAnchor;
    private double sumLat;
    private double sumLng;
    private double sumAcc;
    private int n;
    private long since;
    private long lastInside;
    private int outCount;

    private LocationFix lastEmit;
    private long lastEmitAt;

    VisitTracker(Sink sink) {
        this.sink = sink;
    }

    Mode mode() {
        return mode;
    }

    /** @return true when the motion mode changed (caller should retune the location request). */
    boolean onFix(LocationFix f) {
        Mode before = mode;
        if (!hasAnchor) {
            startAnchor(f);
            emit(f);
            return false;
        }

        double d = LocationFilter.distanceMeters(sumLat / n, sumLng / n, f.lat, f.lng);
        boolean fast = !Float.isNaN(f.speed) && f.speed >= WALKING_SPEED_MPS;
        boolean inside = d <= radius(f) && !fast;

        if (inside) {
            outCount = 0;
            sumLat += f.lat;
            sumLng += f.lng;
            sumAcc += f.accuracy;
            n++;
            lastInside = f.timeMs;
            if (mode == Mode.MOVING) {
                if (f.timeMs - since >= ARRIVE_MS) {
                    mode = Mode.STATIONARY;
                    emit(center(f));
                } else {
                    maybeEmitMoving(f);
                }
            } else if (f.timeMs - lastEmitAt >= HEARTBEAT_MS) {
                emit(center(f));
            }
        } else {
            outCount++;
            if (mode == Mode.MOVING || outCount >= 2 || fast) {
                closeVisit();
                mode = Mode.MOVING;
                startAnchor(f);
                maybeEmitMoving(f);
            }
        }
        return mode != before;
    }

    /** Close an open stay (service stopping / app killed). */
    void flush() {
        if (mode == Mode.STATIONARY) closeVisit();
        hasAnchor = false;
        mode = Mode.MOVING;
        n = 0;
    }

    /** Compact state for SharedPreferences so a killed process can still report the stay. */
    String serialize() {
        if (!hasAnchor || mode != Mode.STATIONARY || n == 0) return "";
        return sumLat / n + "|" + sumLng / n + "|" + sumAcc / n + "|" + since + "|" + lastInside;
    }

    /** Emit the visit held in {@link #serialize()} output, if it lasted long enough. */
    static void closeSerialized(String s, Sink sink) {
        if (s == null || s.isEmpty()) return;
        String[] p = s.split("\\|");
        if (p.length != 5) return;
        try {
            double lat = Double.parseDouble(p[0]);
            double lng = Double.parseDouble(p[1]);
            float acc = (float) Double.parseDouble(p[2]);
            long arrival = Long.parseLong(p[3]);
            long depart = Long.parseLong(p[4]);
            if (depart - arrival >= MIN_VISIT_MS) {
                sink.visit(new LocationFix(lat, lng, acc, arrival, Float.NaN, Float.NaN, Double.NaN, "fused"),
                        arrival, depart);
            }
        } catch (NumberFormatException ignored) {
            // corrupt snapshot: drop
        }
    }

    private void closeVisit() {
        if (mode == Mode.STATIONARY && n > 0 && lastInside - since >= MIN_VISIT_MS) {
            sink.visit(new LocationFix(sumLat / n, sumLng / n, (float) (sumAcc / n), since,
                    Float.NaN, Float.NaN, Double.NaN, "fused"), since, lastInside);
        }
    }

    private void startAnchor(LocationFix f) {
        hasAnchor = true;
        sumLat = f.lat;
        sumLng = f.lng;
        sumAcc = f.accuracy;
        n = 1;
        since = f.timeMs;
        lastInside = f.timeMs;
        outCount = 0;
    }

    private double radius(LocationFix f) {
        if (mode == Mode.STATIONARY) return Math.max(80.0, Math.min(2.5 * f.accuracy, 150.0));
        return Math.max(60.0, Math.min(2.0 * f.accuracy, 120.0));
    }

    private LocationFix center(LocationFix f) {
        return new LocationFix(sumLat / n, sumLng / n, (float) (sumAcc / n), f.timeMs,
                f.speed, f.bearing, f.altitude, f.provider);
    }

    private void maybeEmitMoving(LocationFix f) {
        if (lastEmit == null
                || f.timeMs - lastEmitAt >= MOVING_EMIT_MS
                || LocationFilter.distanceMeters(lastEmit.lat, lastEmit.lng, f.lat, f.lng) >= MOVING_EMIT_DIST_M) {
            emit(f);
        }
    }

    private void emit(LocationFix f) {
        lastEmit = f;
        lastEmitAt = f.timeMs;
        sink.point(f);
    }
}
