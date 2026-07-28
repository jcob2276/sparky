package com.noop.ble

internal object ReconnectBackoff {
    const val BASE_DELAY_MS = 3_000L
    const val MAX_DELAY_MS = 60_000L

    fun nextDelayMs(attempt: Int): Long {
        val n = attempt.coerceAtLeast(1)
        if (n >= 6) return MAX_DELAY_MS
        val delay = BASE_DELAY_MS shl (n - 1)
        return delay.coerceAtMost(MAX_DELAY_MS)
    }
}
