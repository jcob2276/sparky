package app.vanguard.os

import com.noop.ble.ReconnectBackoff

object NoopOuraTransport {
    @JvmStatic
    fun reconnectDelayMs(attempt: Int): Long = ReconnectBackoff.nextDelayMs(attempt)
}
