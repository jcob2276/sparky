package app.vanguard.os;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OuraBleMarkersTest {

    @Test
    public void recognisesOuraHealthCompanyIdentifier() {
        assertTrue(OuraBleMarkers.isOuraManufacturer(0x02B2));
    }

    @Test
    public void doesNotMisclassifyAdafruitAsOura() {
        assertFalse(OuraBleMarkers.isOuraManufacturer(0x0822));
    }

    @Test
    public void recognisesBondedGen3SystemName() {
        assertTrue(OuraBleMarkers.isOuraName("Oura Y1144305359"));
        assertFalse(OuraBleMarkers.isOuraName("Forerunner 45"));
    }
}
