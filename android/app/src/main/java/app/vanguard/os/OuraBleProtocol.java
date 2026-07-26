package app.vanguard.os;


/** Android transport utilities only. Oura protocol behavior lives in the vendored NOOP classes. */
final class OuraBleProtocol {
    private OuraBleProtocol() {}

    static String resolveStoredDeviceId(String requestedDeviceId, String selectedAddress) {
        String requested = requestedDeviceId == null || requestedDeviceId.trim().isEmpty()
            ? "oura-ring"
            : requestedDeviceId.trim();
        if ("oura-ring".equals(requested)
                && selectedAddress != null && !selectedAddress.trim().isEmpty()) {
            return "oura:" + selectedAddress.trim();
        }
        return requested;
    }

    static long reconnectDelayMs(int attempt) {
        int normalized = Math.max(1, attempt);
        if (normalized >= 6) return 60_000L;
        return Math.min(60_000L, 3_000L << (normalized - 1));
    }

    static long historyPollIntervalMs() {
        return 900_000L;
    }

    static boolean shouldEnableNotificationsImmediately(boolean mtuRequestAccepted) {
        return !mtuRequestAccepted;
    }

}
