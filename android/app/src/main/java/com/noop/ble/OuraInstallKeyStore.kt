package com.noop.ble

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure, at-rest-encrypted storage for an Oura ring's 16-byte application install key.
 * This is the NOOP Android implementation and namespace.
 */
object OuraInstallKeyStore {
    private const val FILE_NAME = "noop_oura_secure_prefs"
    private const val KEY_PREFIX = "install_key_"
    private const val ADOPT_PREFIX = "adopt_intent_"
    const val KEY_LENGTH = 16

    private fun prefKey(deviceId: String) = "$KEY_PREFIX$deviceId"
    private fun adoptKey(deviceId: String) = "$ADOPT_PREFIX$deviceId"

    private fun prefs(ctx: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(ctx.applicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            ctx.applicationContext,
            FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun save(ctx: Context, deviceId: String, key: IntArray): Boolean {
        if (key.size != KEY_LENGTH) return false
        if (key.any { it !in 0..255 }) return false
        val bytes = ByteArray(KEY_LENGTH) { key[it].toByte() }
        val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
        prefs(ctx).edit().putString(prefKey(deviceId), encoded).apply()
        return true
    }

    fun load(ctx: Context, deviceId: String): IntArray? {
        val encoded = prefs(ctx).getString(prefKey(deviceId), null) ?: return null
        val bytes = runCatching { Base64.decode(encoded, Base64.NO_WRAP) }.getOrNull() ?: return null
        if (bytes.size != KEY_LENGTH) return null
        return IntArray(KEY_LENGTH) { bytes[it].toInt() and 0xFF }
    }

    fun hasKey(ctx: Context, deviceId: String): Boolean = load(ctx, deviceId) != null

    fun clear(ctx: Context, deviceId: String) {
        prefs(ctx).edit().remove(prefKey(deviceId)).remove(adoptKey(deviceId)).apply()
    }

    fun setPendingAdopt(ctx: Context, deviceId: String, intent: Boolean) {
        if (intent) {
            prefs(ctx).edit().putBoolean(adoptKey(deviceId), true).apply()
        } else {
            prefs(ctx).edit().remove(adoptKey(deviceId)).apply()
        }
    }

    fun consumePendingAdopt(ctx: Context, deviceId: String): Boolean {
        val p = prefs(ctx)
        val armed = p.getBoolean(adoptKey(deviceId), false)
        if (armed) p.edit().remove(adoptKey(deviceId)).apply()
        return armed
    }
}
