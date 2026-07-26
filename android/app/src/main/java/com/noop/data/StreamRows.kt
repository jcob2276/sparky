package com.noop.data

data class StreamBatch(
    val hr: List<HrRow> = emptyList(),
    val rr: List<RrRow> = emptyList(),
    val events: List<EventEntry> = emptyList(),
    val battery: List<BatteryRow> = emptyList(),
    val spo2: List<Spo2Row> = emptyList(),
    val skinTemp: List<SkinTempRow> = emptyList(),
    val resp: List<RespRow> = emptyList(),
    val gravity: List<GravityRow> = emptyList(),
    val steps: List<StepRow> = emptyList(),
    val sleepState: List<SleepStateRow> = emptyList(),
    val ppgHr: List<PpgHrRow> = emptyList(),
    val droppedImplausibleTs: Int = 0,
) {
    val isEmpty: Boolean
        get() = hr.isEmpty() && rr.isEmpty() && events.isEmpty() && battery.isEmpty() &&
            spo2.isEmpty() && skinTemp.isEmpty() && resp.isEmpty() && gravity.isEmpty() &&
            steps.isEmpty() && sleepState.isEmpty() && ppgHr.isEmpty()
}

data class HrRow(val ts: Long, val bpm: Int)
data class RrRow(val ts: Long, val rrMs: Int)
data class EventEntry(val ts: Long, val kind: String, val payloadJSON: String)
data class BatteryRow(val ts: Long, val soc: Double?, val mv: Int?, val charging: Boolean? = null)
data class Spo2Row(val ts: Long, val red: Int, val ir: Int)
data class SkinTempRow(val ts: Long, val raw: Int)
data class StepRow(val ts: Long, val counter: Int, val activityClass: Int? = null)
data class SleepStateRow(val ts: Long, val state: Int)
data class RespRow(val ts: Long, val raw: Int)
data class GravityRow(val ts: Long, val x: Double, val y: Double, val z: Double)
data class PpgHrRow(val ts: Long, val bpm: Int, val conf: Double)
