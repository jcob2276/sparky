package app.vanguard.os;

import android.content.Context;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Blocking client for the `widget-food` edge function. Call off the main thread. */
final class FoodWidgetApi {

    static final class ApiException extends Exception {
        final int status;

        ApiException(int status, String message) {
            super(message);
            this.status = status;
        }
    }

    private FoodWidgetApi() {}

    static JSONObject call(Context context, JSONObject body) throws Exception {
        return call(context, "widget-food", body);
    }

    static JSONObject call(Context context, String function, JSONObject body) throws Exception {
        String baseUrl = FoodWidgetStore.baseUrl(context);
        String userId = FoodWidgetStore.userId(context);
        String token = FoodWidgetStore.token(context);
        if (baseUrl == null || userId == null || token == null) {
            throw new ApiException(401, "Otwórz aplikację raz, żeby połączyć widget.");
        }
        body.put("userId", userId);
        HttpURLConnection conn = (HttpURLConnection) new URL(baseUrl + "/functions/v1/" + function).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(60000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("x-widget-token", token);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String text = stream == null ? "{}" : readAll(stream);
            JSONObject json = text.isEmpty() ? new JSONObject() : new JSONObject(text);
            if (status >= 400) {
                throw new ApiException(status, json.optString("error", "Błąd połączenia (" + status + ")"));
            }
            return json;
        } finally {
            conn.disconnect();
        }
    }

    static JSONObject refreshState(Context context) throws Exception {
        JSONObject state = call(context, new JSONObject().put("action", "state"));
        FoodWidgetStore.saveState(context, state.toString());
        return state;
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toString("UTF-8");
    }
}
