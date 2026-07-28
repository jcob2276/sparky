package app.vanguard.os;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/** Read-only migration bridge for keys written by pre-NOOP Vanguard builds. */
final class OuraAuthKeyStore {
    private static final int KEY_LENGTH = 16;
    private static final String FILE_NAME = "vanguard_oura_secure_prefs";
    private static final String KEY_PREFIX = "install_key_";

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

}
