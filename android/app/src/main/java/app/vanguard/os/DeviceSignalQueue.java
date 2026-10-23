package app.vanguard.os;

import android.content.Context;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Offline-first append-only queue (JSON lines) for phone signal events.
 * Events survive process death; the WebView drains + acks batches when online.
 * Capped so a long offline stretch can never fill the disk.
 */
final class DeviceSignalQueue {

    interface SizeListener {
        void onSize(int size);
    }

    private static final String FILE_NAME = "device_signals_queue.jsonl";
    private static final String KEY_SEQ = "queue_seq";
    private static final int MAX_EVENTS = 3000;
    private static final Object LOCK = new Object();
    private static long seq = -1L;
    private static int count = -1;
    private static SizeListener listener;

    private DeviceSignalQueue() {}

    static void setSizeListener(SizeListener l) {
        listener = l;
    }

    static void add(Context ctx, String kind, long ts, JSObject payload) {
        int size;
        synchronized (LOCK) {
            Context app = ctx.getApplicationContext();
            ensureLoaded(app);
            seq++;
            DeviceSignalConfig.prefs(app).edit().putLong(KEY_SEQ, seq).apply();
            JSObject line = new JSObject();
            line.put("s", seq);
            line.put("t", ts);
            line.put("k", kind);
            line.put("p", payload == null ? new JSObject() : payload);
            try (FileOutputStream out = new FileOutputStream(file(app), true)) {
                out.write((line.toString() + "\n").getBytes(StandardCharsets.UTF_8));
                count++;
            } catch (IOException e) {
                return;
            }
            if (count > MAX_EVENTS) {
                dropOldest(app, count - MAX_EVENTS);
            }
            size = count;
        }
        SizeListener l = listener;
        if (l != null) l.onSize(size);
    }

    /** First {@code max} queued events as {id, ts, kind, payload}. */
    static JSArray peek(Context ctx, int max) {
        JSArray out = new JSArray();
        synchronized (LOCK) {
            for (JSONObject line : readAll(ctx.getApplicationContext())) {
                if (out.length() >= max) break;
                JSObject row = new JSObject();
                row.put("id", line.optLong("s"));
                row.put("ts", line.optLong("t"));
                row.put("kind", line.optString("k"));
                JSONObject p = line.optJSONObject("p");
                row.put("payload", p == null ? new JSObject() : p);
                out.put(row);
            }
        }
        return out;
    }

    /** Removes every event with id <= upToId. */
    static int ack(Context ctx, long upToId) {
        synchronized (LOCK) {
            Context app = ctx.getApplicationContext();
            List<JSONObject> keep = new ArrayList<>();
            for (JSONObject line : readAll(app)) {
                if (line.optLong("s") > upToId) keep.add(line);
            }
            rewrite(app, keep);
            return count;
        }
    }

    static int size(Context ctx) {
        synchronized (LOCK) {
            ensureLoaded(ctx.getApplicationContext());
            return count;
        }
    }

    private static void ensureLoaded(Context app) {
        if (count >= 0) return;
        List<JSONObject> lines = readAll(app);
        count = lines.size();
        long max = DeviceSignalConfig.prefs(app).getLong(KEY_SEQ, 0L);
        for (JSONObject line : lines) max = Math.max(max, line.optLong("s"));
        seq = max;
    }

    private static void dropOldest(Context app, int drop) {
        List<JSONObject> lines = readAll(app);
        int from = Math.min(drop, lines.size());
        rewrite(app, new ArrayList<>(lines.subList(from, lines.size())));
    }

    private static void rewrite(Context app, List<JSONObject> lines) {
        StringBuilder sb = new StringBuilder();
        for (JSONObject line : lines) sb.append(line.toString()).append('\n');
        try (FileOutputStream out = new FileOutputStream(file(app), false)) {
            out.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            count = lines.size();
        } catch (IOException ignored) {
            // keep in-memory count; next add retries
        }
    }

    private static List<JSONObject> readAll(Context app) {
        List<JSONObject> out = new ArrayList<>();
        File f = file(app);
        if (!f.exists()) return out;
        try (BufferedReader r = new BufferedReader(
            new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String s;
            while ((s = r.readLine()) != null) {
                if (s.isEmpty()) continue;
                try {
                    out.add(new JSONObject(s));
                } catch (JSONException ignored) {
                    // skip corrupt line
                }
            }
        } catch (IOException ignored) {
            // return what we have
        }
        return out;
    }

    private static File file(Context app) {
        return new File(app.getFilesDir(), FILE_NAME);
    }
}
