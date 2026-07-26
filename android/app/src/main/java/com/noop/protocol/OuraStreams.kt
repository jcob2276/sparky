package com.noop.protocol

data class HrSample(val ts: Int, val bpm: Int)
data class RrInterval(val ts: Int, val rrMs: Int)
data class Spo2Sample(val ts: Int, val red: Int, val ir: Int, val unit: String = "raw_adc")
data class SkinTempSample(val ts: Int, val raw: Int, val unit: String = "raw_adc")
data class WhoopEvent(val ts: Int, val kind: String, val payload: Map<String, Any?>)
data class BatterySample(
    val ts: Int,
    val soc: Double?,
    val mv: Int?,
    val charging: Boolean? = null,
)

data class Streams(
    val hr: MutableList<HrSample> = mutableListOf(),
    val rr: MutableList<RrInterval> = mutableListOf(),
    val events: MutableList<WhoopEvent> = mutableListOf(),
    val battery: MutableList<BatterySample> = mutableListOf(),
    val spo2: MutableList<Spo2Sample> = mutableListOf(),
    val skinTemp: MutableList<SkinTempSample> = mutableListOf(),
)
