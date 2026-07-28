package com.noop.ble

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReconnectBackoffTest {
    @Test
    fun sequenceMatchesNoop() {
        assertEquals(3_000L, ReconnectBackoff.nextDelayMs(1))
        assertEquals(6_000L, ReconnectBackoff.nextDelayMs(2))
        assertEquals(12_000L, ReconnectBackoff.nextDelayMs(3))
        assertEquals(24_000L, ReconnectBackoff.nextDelayMs(4))
        assertEquals(48_000L, ReconnectBackoff.nextDelayMs(5))
        assertEquals(60_000L, ReconnectBackoff.nextDelayMs(6))
    }

    @Test
    fun invalidAndLargeAttemptsStayInsideNoopBounds() {
        assertEquals(ReconnectBackoff.BASE_DELAY_MS, ReconnectBackoff.nextDelayMs(0))
        assertEquals(ReconnectBackoff.BASE_DELAY_MS, ReconnectBackoff.nextDelayMs(Int.MIN_VALUE))
        assertEquals(ReconnectBackoff.MAX_DELAY_MS, ReconnectBackoff.nextDelayMs(Int.MAX_VALUE))
        for (attempt in 1..100) {
            assertTrue(ReconnectBackoff.nextDelayMs(attempt) <= ReconnectBackoff.MAX_DELAY_MS)
        }
    }
}
