package com.noop.ble

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists the Oura `GetEvents` cursor per ring. Exact Android NOOP store.
 */
object OuraHistoryCursorStore {
    private const val FILE_NAME = "noop_oura_history_cursor"
    private const val KEY_PREFIX = "history_cursor_"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    private fun prefKey(deviceId: String) = "$KEY_PREFIX$deviceId"

    fun read(ctx: Context, deviceId: String): Long {
        val raw = runCatching { prefs(ctx).getLong(prefKey(deviceId), 0L) }.getOrDefault(0L)
        return raw.coerceIn(0L, 0xFFFF_FFFFL)
    }

    fun save(ctx: Context, deviceId: String, cursor: Long) {
        runCatching { prefs(ctx).edit().putLong(prefKey(deviceId), cursor and 0xFFFF_FFFFL).apply() }
    }
}
