package app.vanguard.os;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Durable offline queue of filtered location points / visits.
 * The web layer drains it in batches and acks only after a successful upload.
 */
final class LocationQueueStore extends SQLiteOpenHelper {

    private static final String DB_NAME = "location_queue.db";
    private static final int DB_VERSION = 1;
    private static final String TABLE = "loc_queue";
    private static final int MAX_ROWS = 20_000;
    private static final long MAX_AGE_MS = 30L * 24L * 3600L * 1000L;

    private static LocationQueueStore instance;

    static synchronized LocationQueueStore get(Context ctx) {
        if (instance == null) instance = new LocationQueueStore(ctx.getApplicationContext());
        return instance;
    }

    private LocationQueueStore(Context ctx) {
        super(ctx, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE + " (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "ts INTEGER NOT NULL, kind TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, "
                + "acc REAL, speed REAL, bearing REAL, alt REAL, provider TEXT, dwell INTEGER, "
                + "UNIQUE(ts, kind))");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldV, int newV) {
        // v1 only
    }

    synchronized void insert(String kind, LocationFix f, long tsMs, int dwellSeconds) {
        ContentValues v = new ContentValues();
        v.put("ts", tsMs);
        v.put("kind", kind);
        v.put("lat", f.lat);
        v.put("lng", f.lng);
        putFinite(v, "acc", f.accuracy);
        putFinite(v, "speed", f.speed);
        putFinite(v, "bearing", f.bearing);
        putFinite(v, "alt", f.altitude);
        if (f.provider != null) v.put("provider", f.provider);
        if ("visit".equals(kind)) v.put("dwell", dwellSeconds);
        getWritableDatabase().insertWithOnConflict(TABLE, null, v, SQLiteDatabase.CONFLICT_IGNORE);
    }

    private static void putFinite(ContentValues v, String key, double value) {
        if (!Double.isNaN(value) && !Double.isInfinite(value)) v.put(key, value);
    }

    synchronized int count() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM " + TABLE, null)) {
            return c.moveToFirst() ? c.getInt(0) : 0;
        }
    }

    /** Oldest-first batch. Row ids are returned so the caller can ack them. */
    synchronized JSONArray drain(int limit) {
        JSONArray out = new JSONArray();
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT id, ts, kind, lat, lng, acc, speed, bearing, alt, provider, dwell FROM "
                        + TABLE + " ORDER BY ts ASC LIMIT ?", new String[]{String.valueOf(limit)})) {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                try {
                    o.put("id", c.getLong(0));
                    o.put("ts", c.getLong(1));
                    o.put("kind", c.getString(2));
                    o.put("lat", c.getDouble(3));
                    o.put("lng", c.getDouble(4));
                    putCol(o, "accuracy", c, 5);
                    putCol(o, "speed", c, 6);
                    putCol(o, "bearing", c, 7);
                    putCol(o, "altitude", c, 8);
                    if (!c.isNull(9)) o.put("provider", c.getString(9));
                    if (!c.isNull(10)) o.put("dwellSeconds", c.getInt(10));
                    out.put(o);
                } catch (JSONException ignored) {
                    // skip malformed row; trimmed by age later
                }
            }
        }
        return out;
    }

    private static void putCol(JSONObject o, String key, Cursor c, int idx) throws JSONException {
        if (!c.isNull(idx)) o.put(key, c.getDouble(idx));
    }

    synchronized void ack(long[] ids) {
        if (ids.length == 0) return;
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            for (long id : ids) db.delete(TABLE, "id = ?", new String[]{String.valueOf(id)});
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Bounded storage: drop rows older than 30 days and keep at most MAX_ROWS newest. */
    synchronized void trim() {
        SQLiteDatabase db = getWritableDatabase();
        db.delete(TABLE, "ts < ?", new String[]{String.valueOf(System.currentTimeMillis() - MAX_AGE_MS)});
        db.execSQL("DELETE FROM " + TABLE + " WHERE id NOT IN (SELECT id FROM " + TABLE
                + " ORDER BY ts DESC LIMIT " + MAX_ROWS + ")");
    }
}
