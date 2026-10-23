package app.vanguard.os;

/** Immutable GPS/fused fix with the quality fields we persist. NaN means "not available". */
final class LocationFix {
    final double lat;
    final double lng;
    final float accuracy;
    final long timeMs;
    final float speed;
    final float bearing;
    final double altitude;
    final String provider;

    LocationFix(double lat, double lng, float accuracy, long timeMs,
                float speed, float bearing, double altitude, String provider) {
        this.lat = lat;
        this.lng = lng;
        this.accuracy = accuracy;
        this.timeMs = timeMs;
        this.speed = speed;
        this.bearing = bearing;
        this.altitude = altitude;
        this.provider = provider;
    }
}
