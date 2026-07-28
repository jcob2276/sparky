package app.vanguard.os

import com.noop.oura.OuraDriver
import com.noop.oura.OuraEvent
import com.noop.oura.OuraRecord
import com.noop.oura.OuraReassembler
import com.noop.oura.OuraRingGen
import com.noop.oura.OuraTransition
import com.noop.oura.OuraFraming
import com.noop.oura.GetEventsSummary
import com.noop.oura.OuraDriverPhase
import com.noop.oura.OuraCommands
import com.noop.oura.OuraDecoders
import com.noop.data.OuraStreamMapping
import com.noop.protocol.Streams

/**
 * Java-facing transport adapter. It contains no protocol decisions: every command,
 * decode and clock conversion is delegated to the vendored NOOP state machine.
 */
class NoopOuraBridge(
    authKey: IntArray?,
    allowTierB: Boolean = false,
    allowKeyInstall: Boolean = false,
) {
    data class SecureResult(
        val commands: List<ByteArray> = emptyList(),
        val streams: Streams = Streams(),
        val streamBatches: List<Streams> = emptyList(),
        val liveBpm: Int? = null,
        val liveIbiMs: Int? = null,
        val streaming: Boolean = false,
        val needsKeyInstall: Boolean = false,
        val authFailed: Boolean = false,
    )
    private val driver = OuraDriver(
        ringGen = OuraRingGen.GEN3,
        authKey = authKey,
        allowTierB = allowTierB,
        allowKeyInstall = allowKeyInstall,
    )
    private val reassembler = OuraReassembler()
    private val pending = ArrayList<OuraEvent>()

    fun ingest(record: OuraRecord): List<OuraEvent> = driver.ingest(record)

    fun readyCommands(): List<ByteArray> =
        driver.nextStep(OuraTransition.Ready).toByteArrays()

    fun needsKeyInstall(): Boolean =
        driver.phase == OuraDriverPhase.NeedsKeyInstall

    fun unixSeconds(ringTimestamp: Long): Long? =
        driver.unixSeconds(forRingTimestamp = ringTimestamp)

    fun ingestNotification(fragment: ByteArray, arrivalUnixSeconds: Int): Streams {
        val out = Streams()
        ingestNotificationBatches(fragment, arrivalUnixSeconds).forEach(out::append)
        return out
    }

    fun ingestNotificationBatches(
        fragment: ByteArray,
        arrivalUnixSeconds: Int,
    ): List<Streams> {
        val out = ArrayList<Streams>()
        for (record in reassembler.feed(fragment)) {
            for (event in driver.ingest(record)) {
                when (event) {
                    is OuraEvent.Hr,
                    is OuraEvent.Ibi,
                    is OuraEvent.Battery ->
                        out.add(OuraStreamMapping.streams(listOf(event)) { arrivalUnixSeconds })

                    is OuraEvent.Temp -> {
                        if (event.value.celsius in 20.0..45.0) {
                            appendAnchoredOrPark(out, event, event.value.ringTimestamp)
                        }
                    }
                    is OuraEvent.Spo2 ->
                        appendAnchoredOrPark(out, event, event.value.ringTimestamp)
                    is OuraEvent.Hrv ->
                        appendAnchoredOrPark(out, event, event.value.ringTimestamp)
                    is OuraEvent.SleepPhaseEvent ->
                        appendAnchoredOrPark(out, event, event.value.ringTimestamp)
                    is OuraEvent.TimeSyncEvent -> {
                        val events = ArrayList(pending)
                        pending.clear()
                        events.forEach { pendingEvent ->
                            out.add(OuraStreamMapping.streams(listOf(pendingEvent)) { ringTimestamp ->
                                driver.unixSeconds(ringTimestamp)?.toInt() ?: arrivalUnixSeconds
                            })
                        }
                    }
                    else -> Unit
                }
            }
        }
        return out
    }

    private fun appendAnchoredOrPark(
        out: MutableList<Streams>,
        event: OuraEvent,
        ringTimestamp: Long,
    ) {
        val timestamp = driver.unixSeconds(ringTimestamp)?.toInt()
        if (timestamp == null) {
            pending.add(event)
        } else {
            out.add(OuraStreamMapping.streams(listOf(event)) { timestamp })
        }
    }

    fun reset() {
        pending.clear()
        reassembler.reset()
        driver.stop()
    }

    fun drainAtTeardown(arrivalUnixSeconds: Int): Streams {
        val out = Streams()
        drainAtTeardownBatches(arrivalUnixSeconds).forEach(out::append)
        return out
    }

    fun drainAtTeardownBatches(arrivalUnixSeconds: Int): List<Streams> {
        val events = ArrayList(pending)
        pending.clear()
        return events.map { event ->
            OuraStreamMapping.streams(listOf(event)) { ringTimestamp ->
                driver.unixSeconds(ringTimestamp)?.toInt() ?: arrivalUnixSeconds
            }
        }
    }

    fun startHistory(cursor: Long): List<ByteArray> =
        driver.nextStep(OuraTransition.StartHistoryFetch(cursor)).toByteArrays()

    fun advanceHistory(summary: GetEventsSummary): List<ByteArray> =
        driver.nextStep(
            OuraTransition.HistoryCursorAdvanced(summary.cursor, summary.moreData),
        ).toByteArrays()

    fun handleSecureFrame(frame: ByteArray, arrivalUnixSeconds: Int): SecureResult {
        val unsigned = IntArray(frame.size) { frame[it].toInt() and 0xff }
        val outer = OuraFraming.parseOuterFrame(unsigned) ?: return SecureResult()
        val secure = OuraFraming.parseSecureFrame(outer) ?: return SecureResult()
        var commands = emptyList<ByteArray>()
        var streams = Streams()
        var streamBatches = emptyList<Streams>()
        var bpm: Int? = null
        var ibi: Int? = null
        when (val routed = driver.handleSecureFrame(secure)) {
            is OuraDriver.SecureRouting.Nonce ->
                commands = driver.nextStep(OuraTransition.NonceReceived(routed.nonce)).toByteArrays()
            is OuraDriver.SecureRouting.AuthStatus ->
                commands = driver.nextStep(OuraTransition.AuthCompleted(routed.status)).toByteArrays()
            OuraDriver.SecureRouting.EnableAck ->
                commands = driver.nextStep(OuraTransition.EnableAckReceived).toByteArrays()
            is OuraDriver.SecureRouting.LiveHRPush -> {
                val events = driver.ingestLiveHRPush(routed.body)
                streamBatches = events.map { event ->
                    OuraStreamMapping.streams(listOf(event)) { arrivalUnixSeconds }
                }
                streamBatches.forEach(streams::append)
                bpm = (events.firstOrNull { it is OuraEvent.Hr } as? OuraEvent.Hr)?.value?.bpm
                ibi = (events.firstOrNull { it is OuraEvent.Ibi } as? OuraEvent.Ibi)?.value?.ibiMs
            }
            OuraDriver.SecureRouting.Unhandled -> Unit
        }
        return SecureResult(
            commands = commands,
            streams = streams,
            streamBatches = streamBatches,
            liveBpm = bpm,
            liveIbiMs = ibi,
            streaming = driver.phase == OuraDriverPhase.Streaming,
            needsKeyInstall = driver.phase == OuraDriverPhase.NeedsKeyInstall,
            authFailed = driver.phase is OuraDriverPhase.AuthFailed,
        )
    }

    fun beginKeyInstall(key: IntArray): ByteArray? =
        driver.beginKeyInstall(key)?.let { command ->
            ByteArray(command.bytes.size) { command.bytes[it].toByte() }
        }

    fun keyInstallAcknowledged(): List<ByteArray> =
        driver.keyInstallAcknowledged().toByteArrays()

    fun reengageLiveHrCommands(): List<ByteArray> =
        driver.reengageLiveHRCommands().toByteArrays()

    fun batteryCommand(): ByteArray =
        OuraCommands.getBattery().bytes.toByteArray()

    companion object {
        @JvmStatic
        fun readyCommands(authKey: IntArray): List<ByteArray> {
            val driver = OuraDriver(OuraRingGen.GEN3, authKey)
            return driver.nextStep(OuraTransition.Ready).map { command ->
                ByteArray(command.bytes.size) { command.bytes[it].toByte() }
            }
        }

        @JvmStatic
        fun parseGetEventsFrame(frame: ByteArray): GetEventsSummary? {
            val unsigned = IntArray(frame.size) { frame[it].toInt() and 0xff }
            val outer = OuraFraming.parseOuterFrame(unsigned) ?: return null
            if (outer.op != OuraFraming.getEventsResponseOp) return null
            return OuraFraming.parseGetEventsResponse(outer.body)
        }

        @JvmStatic
        fun splitOuterFrames(notification: ByteArray): List<ByteArray> {
            val unsigned = IntArray(notification.size) { notification[it].toInt() and 0xff }
            return OuraFraming.parseOuterFrames(unsigned).map { frame ->
                ByteArray(frame.totalLength).also { bytes ->
                    bytes[0] = frame.op.toByte()
                    bytes[1] = frame.body.size.toByte()
                    frame.body.forEachIndexed { index, value -> bytes[index + 2] = value.toByte() }
                }
            }
        }

        @JvmStatic
        fun decodeBatteryPercent(frame: ByteArray): Int? {
            val unsigned = IntArray(frame.size) { frame[it].toInt() and 0xff }
            val outer = OuraFraming.parseOuterFrame(unsigned) ?: return null
            if (outer.op != OuraFraming.batteryResponseOp) return null
            return OuraDecoders.decodeBattery(outer.body)?.percent
        }
    }
}

private fun List<com.noop.oura.OuraCommand>.toByteArrays(): List<ByteArray> =
    map { command -> ByteArray(command.bytes.size) { command.bytes[it].toByte() } }

private fun IntArray.toByteArray(): ByteArray =
    ByteArray(size) { this[it].toByte() }

private fun Streams.append(other: Streams) {
    hr.addAll(other.hr)
    rr.addAll(other.rr)
    events.addAll(other.events)
    battery.addAll(other.battery)
    spo2.addAll(other.spo2)
    skinTemp.addAll(other.skinTemp)
}
