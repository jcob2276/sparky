package app.vanguard.os;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/** Android-Keystore-backed, per-ring storage for Oura's 16-byte application key. */
final class OuraAuthKeyStore {
    static final int KEY_LENGTH = 16;
    private static final String FILE_NAME = "vanguard_oura_secure_prefs";
    private static final String KEY_PREFIX = "install_key_";
    private static final String ADOPT_PREFIX = "adopt_intent_";

    private OuraAuthKeyStore() {}

    private static SharedPreferences prefs(Context context) {
        Context appContext = context.getApplicationContext();
        try {
            MasterKey masterKey = new MasterKey.Builder(appContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
            return EncryptedSharedPreferences.create(
                appContext,
                FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (java.security.GeneralSecurityException | java.io.IOException error) {
            throw new IllegalStateException("Cannot open encrypted Oura key storage", error);
        }
    }

    static boolean save(Context context, String deviceId, byte[] key) {
        if (key == null || key.length != KEY_LENGTH) return false;
        String encoded = Base64.encodeToString(key, Base64.NO_WRAP);
        prefs(context).edit().putString(KEY_PREFIX + deviceId, encoded).apply();
        return true;
    }

    static byte[] load(Context context, String deviceId) {
        String encoded = prefs(context).getString(KEY_PREFIX + deviceId, null);
        if (encoded == null) return null;
        try {
            byte[] key = Base64.decode(encoded, Base64.NO_WRAP);
            return key.length == KEY_LENGTH ? key : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    static void setPendingAdopt(Context context, String deviceId, boolean armed) {
        SharedPreferences.Editor edit = prefs(context).edit();
        if (armed) edit.putBoolean(ADOPT_PREFIX + deviceId, true);
        else edit.remove(ADOPT_PREFIX + deviceId);
        edit.apply();
    }

    static boolean consumePendingAdopt(Context context, String deviceId) {
        SharedPreferences preferences = prefs(context);
        String key = ADOPT_PREFIX + deviceId;
        boolean armed = preferences.getBoolean(key, false);
        if (armed) preferences.edit().remove(key).apply();
        return armed;
    }

    static void clear(Context context, String deviceId) {
        prefs(context).edit()
            .remove(KEY_PREFIX + deviceId)
            .remove(ADOPT_PREFIX + deviceId)
            .apply();
    }
}
