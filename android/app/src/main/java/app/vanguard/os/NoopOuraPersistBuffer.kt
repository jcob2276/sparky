package app.vanguard.os

import com.noop.protocol.Streams

/**
 * The sample-buffer rule from NOOP's OuraLiveSource:
 * flush after 30 buffered batches or when an enqueue observes 30 elapsed seconds.
 */
class NoopOuraPersistBuffer(
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    private val lock = Any()
    private val buffer = ArrayList<Streams>()
    private var lastFlushMs = nowMs()

    fun enqueue(streams: Streams): List<Streams> {
        val shouldFlush = synchronized(lock) {
            buffer.add(streams)
            buffer.size >= FLUSH_COUNT || nowMs() - lastFlushMs >= FLUSH_INTERVAL_MS
        }
        return if (shouldFlush) flush() else emptyList()
    }

    fun flush(): List<Streams> = synchronized(lock) {
        lastFlushMs = nowMs()
        if (buffer.isEmpty()) return@synchronized emptyList()
        ArrayList(buffer).also { buffer.clear() }
    }

    companion object {
        private const val FLUSH_COUNT = 30
        private const val FLUSH_INTERVAL_MS = 30_000L
    }
}
