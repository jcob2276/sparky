package app.vanguard.os;

/** Oura base service UUID — detection only (noop/OURA_PROTOCOL.md). */
final class OuraBleMarkers {
    private OuraBleMarkers() {}

    static boolean isOuraName(String name) {
        return name != null
            && name.toLowerCase(java.util.Locale.ROOT).contains("oura");
    }
}
