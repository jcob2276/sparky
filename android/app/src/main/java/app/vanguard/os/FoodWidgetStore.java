package app.vanguard.os;

import android.content.Context;
import android.content.SharedPreferences;

/** Credentials (revocable widget token) and the last known day state for the food widgets. */
final class FoodWidgetStore {

    private static final String PREFS = "vanguard_food_widget";
    private static final String KEY_BASE_URL = "base_url";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_STATE = "state_json";

    private FoodWidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void saveCredentials(Context context, String baseUrl, String userId, String token) {
        prefs(context).edit()
            .putString(KEY_BASE_URL, baseUrl)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_TOKEN, token)
            .remove(KEY_STATE)
            .apply();
    }

    static boolean hasCredentials(Context context) {
        SharedPreferences p = prefs(context);
        return p.getString(KEY_TOKEN, null) != null && p.getString(KEY_USER_ID, null) != null;
    }

    static String baseUrl(Context context) { return prefs(context).getString(KEY_BASE_URL, null); }

    static String userId(Context context) { return prefs(context).getString(KEY_USER_ID, null); }

    static String token(Context context) { return prefs(context).getString(KEY_TOKEN, null); }

    static void saveState(Context context, String json) { prefs(context).edit().putString(KEY_STATE, json).apply(); }

    static String state(Context context) { return prefs(context).getString(KEY_STATE, null); }
}
