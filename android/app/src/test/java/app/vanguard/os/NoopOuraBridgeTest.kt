package app.vanguard.os

import com.noop.oura.OuraRecord
import com.noop.oura.OuraEvent
import com.noop.oura.OuraIBI
import com.noop.oura.OuraSleepPhase
import com.noop.oura.OuraSleepStage
import com.noop.data.OuraStreamMapping
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NoopOuraBridgeTest {
    @Test
    fun readySequenceComesDirectlyFromNoopDriver() {
        val key = IntArray(16) { it }
        val commands = NoopOuraBridge.readyCommands(key)

        assertEquals(2, commands.size)
        assertArrayEquals(byteArrayOf(0x1c, 0x01, 0x3f), commands[0])
        assertArrayEquals(byteArrayOf(0x2f, 0x01, 0x2b), commands[1])
    }

    @Test
    fun ringClockConversionUsesNoopSignedDeltaWithoutArrivalFallback() {
        val bridge = NoopOuraBridge(IntArray(16))
        bridge.ingest(
            OuraRecord(
                type = 0x42,
                ringTimestamp = 1_000,
                payload = intArrayOf(0x00, 0xF1, 0x53, 0x65, 0, 0, 0, 0, 0),
            ),
        )

        assertEquals(1_699_999_990L, bridge.unixSeconds(900))
        assertNull(NoopOuraBridge(IntArray(16)).unixSeconds(900))
    }

    @Test
    fun productionMappingDoesNotInventHrOrSleepOffsets() {
        val streams = OuraStreamMapping.streams(
            listOf(
                OuraEvent.Ibi(OuraIBI(10, 833)),
                OuraEvent.SleepPhaseEvent(OuraSleepPhase(10, 7, OuraSleepStage.REM)),
            ),
        ) { 1_700_000_000 }

        assertEquals(0, streams.hr.size)
        assertEquals(1, streams.rr.size)
        assertEquals(1_700_000_000, streams.events.single().ts)
        assertEquals(7, streams.events.single().payload["index"])
    }

    @Test
    fun historicalIbiUsesArrivalTimeExactlyLikeNoopLiveSourceEmit() {
        val bridge = NoopOuraBridge(IntArray(16))
        val record = byteArrayOf(
            0x80.toByte(), 0x08,
            0x02, 0x00, 0x01, 0x00,
            0x20, 0x0b, 0xee.toByte(), 0x42,
        )

        val streams = bridge.ingestNotification(record, 1_700_000_123)

        assertEquals(1, streams.rr.size)
        assertEquals(800, streams.rr.single().rrMs)
        assertEquals(1_700_000_123, streams.rr.single().ts)
        assertEquals(0, streams.hr.size)
    }

    @Test
    fun batteryResponseUsesNoopDecoder() {
        val frame = byteArrayOf(
            0x0d, 0x08, 0x57, 0x00, 0x00, 0x00, 0x3c, 0x0f, 0x00, 0x00,
        )
        assertEquals(87, NoopOuraBridge.decodeBatteryPercent(frame))
    }

    @Test
    fun noStoredKeyUsesNoopExplicitInstallGate() {
        val bridge = NoopOuraBridge(null, allowKeyInstall = true)
        assertEquals(0, bridge.readyCommands().size)
        assertEquals(true, bridge.needsKeyInstall())
        assertArrayEquals(
            byteArrayOf(0x24, 0x10) + ByteArray(16) { it.toByte() },
            bridge.beginKeyInstall(IntArray(16) { it }),
        )
    }

    @Test
    fun parkedSleepPhasesDrainAtNoopRingClockTime() {
        val bridge = NoopOuraBridge(IntArray(16))
        val sleep = byteArrayOf(
            0x4e, 0x06,
            0x84.toByte(), 0x03, 0x00, 0x00,
            0x00, 0x6c,
        )
        assertEquals(0, bridge.ingestNotification(sleep, 1_800_000_000).events.size)

        val epoch = 1_700_000_000L
        val timeSync = byteArrayOf(
            0x42, 0x0d,
            0xe8.toByte(), 0x03, 0x00, 0x00,
            *ByteArray(8) { ((epoch ushr (8 * it)) and 0xff).toByte() },
            0x00,
        )
        val drained = bridge.ingestNotification(timeSync, 1_800_000_000)

        assertEquals(4, drained.events.size)
        assertEquals(listOf(1, 2, 3, 0), drained.events.map { it.payload["phase"] })
        assertEquals(listOf(1_699_999_990), drained.events.map { it.ts }.distinct())
    }

    @Test
    fun productionKeepsEachNoopSleepPhaseAsItsOwnBufferedBatch() {
        val bridge = NoopOuraBridge(IntArray(16))
        val epoch = 1_700_000_000L
        val timeSync = byteArrayOf(
            0x42, 0x0d,
            0xe8.toByte(), 0x03, 0x00, 0x00,
            *ByteArray(8) { ((epoch ushr (8 * it)) and 0xff).toByte() },
            0x00,
        )
        bridge.ingestNotificationBatches(timeSync, 1_800_000_000)

        val sleep = byteArrayOf(
            0x4e, 0x06,
            0x84.toByte(), 0x03, 0x00, 0x00,
            0x00, 0x6c,
        )
        val batches = bridge.ingestNotificationBatches(sleep, 1_800_000_000)

        assertEquals(4, batches.size)
        assertEquals(listOf(1, 2, 3, 0), batches.map { it.events.single().payload["phase"] })
    }
}
