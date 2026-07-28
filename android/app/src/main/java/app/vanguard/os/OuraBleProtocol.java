package app.vanguard.os;


/** Android transport utilities only. Oura protocol behavior lives in the vendored NOOP classes. */
final class OuraBleProtocol {
    private OuraBleProtocol() {}

    static long historyPollIntervalMs() {
        return 900_000L;
    }

    static boolean shouldEnableNotificationsImmediately(boolean mtuRequestAccepted) {
        return !mtuRequestAccepted;
    }

    static boolean shouldReconnect(boolean intentionalDisconnect, boolean hasTargetDevice) {
        return !intentionalDisconnect && hasTargetDevice;
    }

    static boolean shouldPublishLiveHr(int bpm) {
        return bpm >= 30 && bpm <= 220;
    }

    static boolean shouldPublishLiveIbi(int ibiMs) {
        return ibiMs >= 250 && ibiMs <= 3000;
    }

}
