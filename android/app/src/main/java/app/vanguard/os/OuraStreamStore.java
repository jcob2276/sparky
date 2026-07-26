package app.vanguard.os;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Write + read facade over {@link OuraLocalDb}.
 *
 * Mirrors noop's StreamStore.swift / WhoopRepository insert path:
 *   - Every insert uses INSERT OR IGNORE (= ON CONFLICT DO NOTHING).
 *   - Natural keys are the same as noop's Room entities in Entities.kt.
 *   - dailyMetric is upserted field-by-field so a partial BLE payload
 *     (e.g. temp-only) NEVER overwrites a previously recorded avgHrv/sleep
 *     with NULL — the exact bug we had with Supabase upsert.
 *
 * Thread-safety: SQLiteDatabase under WAL allows concurrent reads alongside
 * the single writer. All write calls must come from one thread at a time
 * (the BLE callback thread is already serialised by the GATT handler).
 */
public class OuraStreamStore {

    private static final String TAG = "OuraStreamStore";

    // ── Event kind constants (mirror noop OuraStreamMapping) ───────────────
    public static final String KIND_SLEEP_PHASE = "OURA_SLEEP_PHASE";
    public static final String KIND_HRV         = "OURA_HRV";
    public static final String KIND_MOTION      = "OURA_MOTION";
    public static final String KIND_STATE       = "OURA_STATE";
    public static final String KIND_WEAR        = "OURA_WEAR";
    public static final String KIND_DEBUG       = "OURA_DEBUG";

    private final OuraLocalDb dbHelper;

    public OuraStreamStore(OuraLocalDb dbHelper) {
        this.dbHelper = dbHelper;
    }

    // ── HR sample — INSERT OR IGNORE (PK: deviceId, ts) ───────────────────

    public void insertHr(String deviceId, long ts, int bpm) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.execSQL(
            "INSERT OR IGNORE INTO hrSample (deviceId, ts, bpm) VALUES (?, ?, ?)",
            new Object[]{deviceId, ts, bpm}
        );
    }

    // ── R-R interval — INSERT OR IGNORE (PK: deviceId, ts, rrMs) ──────────

    public void insertRr(String deviceId, long ts, int rrMs) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.execSQL(
            "INSERT OR IGNORE INTO rrInterval (deviceId, ts, rrMs) VALUES (?, ?, ?)",
            new Object[]{deviceId, ts, rrMs}
        );
    }

    // ── Typed event — INSERT OR IGNORE (PK: deviceId, ts, kind) ──────────

    /** payloadJSON must be deterministic sorted-keys JSON (mirror noop StreamPersistence.encodePayload). */
    public void insertEvent(String deviceId, long ts, String kind, String payloadJSON) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.execSQL(
            "INSERT OR IGNORE INTO event (deviceId, ts, kind, payloadJSON) VALUES (?, ?, ?, ?)",
            new Object[]{deviceId, ts, kind, payloadJSON}
        );
    }

    // ── SpO2 — INSERT OR IGNORE (PK: deviceId, ts) ────────────────────────

    /** red = Oura's decoded SpO2 value; ir = 0 (single-channel, mirror noop OuraStreamMapping). */
    public void insertSpo2(String deviceId, long ts, int red, int ir) {
        insertSpo2(deviceId, ts, red, ir, "raw_adc");
    }

    public void insertSpo2(String deviceId, long ts, int red, int ir, String unit) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.execSQL(
            "INSERT OR IGNORE INTO spo2Sample (deviceId, ts, red, ir, unit) VALUES (?, ?, ?, ?, ?)",
            new Object[]{deviceId, ts, red, ir, unit}
        );
    }

    // ── Skin temp — INSERT OR IGNORE (PK: deviceId, ts) ───────────────────

    /** raw = celsius * 100 (centi-°C), matching noop SkinTempSample convention. */
    public void insertSkinTemp(String deviceId, long ts, int centiCelsius) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.execSQL(
            "INSERT OR IGNORE INTO skinTempSample (deviceId, ts, raw) VALUES (?, ?, ?)",
            new Object[]{deviceId, ts, centiCelsius}
        );
    }

    // ── Reads ──────────────────────────────────────────────────────────────

    /**
     * Returns daily metrics for a device, newest first, up to {@code limit} days.
     * JSON shape mirrors the Supabase oura_daily_summary columns so the JS layer
     * can treat both sources identically.
     */
    public JSONArray queryDailyMetrics(String deviceId, int limit) {
        JSONArray out = new JSONArray();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT day, totalSleepMin, deepMin, remMin, lightMin, restingHr, avgHrv," +
            "       spo2Pct, skinTempDevC, respRateBpm, recovery, strain" +
            "  FROM dailyMetric" +
            " WHERE deviceId = ?" +
            " ORDER BY day DESC" +
            " LIMIT ?",
            new String[]{deviceId, String.valueOf(limit)}
        );
        try {
            while (c.moveToNext()) {
                JSONObject row = new JSONObject();
                row.put("date",              c.getString(0));
                row.put("total_sleep_hours", nullOrDouble(c, 1, 1.0 / 60.0));  // min → hours
                row.put("deep_sleep_hours",  nullOrDouble(c, 2, 1.0 / 60.0));
                row.put("rem_sleep_hours",   nullOrDouble(c, 3, 1.0 / 60.0));
                row.put("light_sleep_hours", nullOrDouble(c, 4, 1.0 / 60.0));
                row.put("rhr_avg",           nullOrInt(c, 5));
                row.put("hrv_avg",           nullOrDouble(c, 6, 1.0));
                row.put("spo2_avg",          nullOrDouble(c, 7, 1.0));
                row.put("temp_deviation",    nullOrDouble(c, 8, 1.0));
                row.put("resp_rate",         nullOrDouble(c, 9, 1.0));
                row.put("recovery",          nullOrDouble(c, 10, 1.0));
                row.put("strain",            nullOrDouble(c, 11, 1.0));
                out.put(row);
            }
        } catch (Exception e) {
            Log.e(TAG, "queryDailyMetrics failed", e);
        } finally {
            c.close();
        }
        return out;
    }

    /**
     * Returns the count of HR samples in the last 24 hours for diagnostics.
     */
    public int hrSampleCount(String deviceId, long sinceTs) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT COUNT(*) FROM hrSample WHERE deviceId = ? AND ts >= ?",
            new String[]{deviceId, String.valueOf(sinceTs)}
        );
        try {
            return c.moveToFirst() ? c.getInt(0) : 0;
        } finally {
            c.close();
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static Object nullOrDouble(Cursor c, int col, double multiplier) {
        if (c.isNull(col)) return JSONObject.NULL;
        return c.getDouble(col) * multiplier;
    }

    private static Object nullOrInt(Cursor c, int col) {
        if (c.isNull(col)) return JSONObject.NULL;
        return c.getInt(col);
    }
}
