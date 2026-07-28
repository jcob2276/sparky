package app.vanguard.os;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OuraBleProtocolTest {

    @Test
    public void reconnectsOnlyForInvoluntaryDropWithKnownRingLikeNoop() {
        assertTrue(OuraBleProtocol.shouldReconnect(false, true));
        assertFalse(OuraBleProtocol.shouldReconnect(true, true));
        assertFalse(OuraBleProtocol.shouldReconnect(false, false));
    }

    @Test
    public void liveUiUsesNoopPhysiologicalGates() {
        assertFalse(OuraBleProtocol.shouldPublishLiveHr(29));
        assertTrue(OuraBleProtocol.shouldPublishLiveHr(30));
        assertTrue(OuraBleProtocol.shouldPublishLiveHr(220));
        assertFalse(OuraBleProtocol.shouldPublishLiveHr(221));

        assertFalse(OuraBleProtocol.shouldPublishLiveIbi(249));
        assertTrue(OuraBleProtocol.shouldPublishLiveIbi(250));
        assertTrue(OuraBleProtocol.shouldPublishLiveIbi(3000));
        assertFalse(OuraBleProtocol.shouldPublishLiveIbi(3001));
    }
}
