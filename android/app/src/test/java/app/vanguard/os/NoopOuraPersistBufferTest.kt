package app.vanguard.os

import com.noop.protocol.HrSample
import com.noop.protocol.Streams
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NoopOuraPersistBufferTest {
    @Test
    fun flushesAtThirtyBatchesExactlyLikeNoopOuraLiveSource() {
        var now = 1_000L
        val buffer = NoopOuraPersistBuffer { now }

        repeat(29) { index ->
            assertTrue(
                buffer.enqueue(Streams(hr = mutableListOf(HrSample(index, 60)))).isEmpty(),
            )
        }

        val flushed = buffer.enqueue(Streams(hr = mutableListOf(HrSample(29, 60))))
        assertEquals(30, flushed.size)
        assertTrue(buffer.flush().isEmpty())
    }

    @Test
    fun flushesOnNextBatchAfterThirtySecondsExactlyLikeNoopOuraLiveSource() {
        var now = 1_000L
        val buffer = NoopOuraPersistBuffer { now }

        assertTrue(
            buffer.enqueue(Streams(hr = mutableListOf(HrSample(1, 60)))).isEmpty(),
        )
        now += 29_999L
        assertTrue(
            buffer.enqueue(Streams(hr = mutableListOf(HrSample(2, 60)))).isEmpty(),
        )
        now += 1L

        val flushed = buffer.enqueue(Streams(hr = mutableListOf(HrSample(3, 60))))
        assertEquals(3, flushed.size)
    }

    @Test
    fun explicitFlushDrainsEveryPendingBatch() {
        val buffer = NoopOuraPersistBuffer { 1_000L }
        repeat(4) { index ->
            buffer.enqueue(Streams(hr = mutableListOf(HrSample(index, 60))))
        }

        assertEquals(4, buffer.flush().size)
        assertTrue(buffer.flush().isEmpty())
    }

    @Test
    fun mappedEmptyBatteryEventsStillCountTowardNoopFlushThreshold() {
        val buffer = NoopOuraPersistBuffer { 1_000L }
        repeat(29) {
            assertTrue(buffer.enqueue(Streams()).isEmpty())
        }

        assertEquals(30, buffer.enqueue(Streams()).size)
    }
}
