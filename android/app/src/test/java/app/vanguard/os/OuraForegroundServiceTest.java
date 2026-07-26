package app.vanguard.os;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OuraForegroundServiceTest {

    @Test
    public void newSelectedAddressRestartsDriverInsteadOfKeepingStaleTarget() {
        assertTrue(OuraForegroundService.needsDriverRestart(
            "49:1E:18:A1:2A:26",
            "4D:98:1E:D7:4F:B7"
        ));
    }

    @Test
    public void sameSelectedAddressDoesNotRestartDriver() {
        assertFalse(OuraForegroundService.needsDriverRestart(
            "4D:98:1E:D7:4F:B7",
            "4d:98:1e:d7:4f:b7"
        ));
    }
}
