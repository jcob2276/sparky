package app.vanguard.os;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

/**
 * Local SQLite store for raw Oura Ring BLE sample streams.
 *
 * Mirrors noop's WhoopDatabase / Database.swift schema so the same
 * natural-key dedup semantics apply:
 *
 *   hrSample      PK (deviceId, ts)        — 1 Hz HR BPM
 *   rrInterval    PK (deviceId, ts, rrMs)   — R-R intervals (HRV raw)
 *   event         PK (deviceId, ts, kind)   — OURA_SLEEP_PHASE, OURA_HRV
 *   spo2Sample    PK (deviceId, ts)         — SpO2 raw ADC
 *   skinTempSample PK (deviceId, ts)        — skin temp (centi-°C)
 *   sleepSession  PK (deviceId, startTs)    — nightly sleep block
 *   dailyMetric   PK (deviceId, day)        — per-day aggregates (YYYY-MM-DD)
 *
 * All ts values are wall-clock unix SECONDS (long).
 * INSERT OR IGNORE on the PK = ON CONFLICT DO NOTHING (noop parity).
 * WAL mode: reads run concurrently with the BLE write path.
 */
public class OuraLocalDb extends SQLiteOpenHelper {

    private static final String TAG = "OuraLocalDb";
    private static final String DB_NAME = "vanguard_oura.db";
    private static final int DB_VERSION = 4;

    // ── Singleton ──────────────────────────────────────────────────────────

    private static volatile OuraLocalDb instance;

    public static OuraLocalDb get(Context ctx) {
        if (instance == null) {
            synchronized (OuraLocalDb.class) {
                if (instance == null) {
                    OuraLocalDb db = new OuraLocalDb(ctx.getApplicationContext());
                    db.getWritableDatabase(); // Force eager table creation on startup
                    instance = db;
                }
            }
        }
        return instance;
    }

    private OuraLocalDb(Context ctx) {
        super(ctx, DB_NAME, null, DB_VERSION);
        setWriteAheadLoggingEnabled(true);
    }

    // ── Schema ─────────────────────────────────────────────────────────────

    @Override
    public void onCreate(SQLiteDatabase db) {
        ensureTablesCreated(db);
        Log.i(TAG, "OuraLocalDb schema created (v1)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        ensureTablesCreated(db);
        addMissingColumns(db);
        Log.i(TAG, "OuraLocalDb upgrade " + oldVersion + " → " + newVersion);
    }

    /** Idempotent — adds any column that may be missing from older DB files. */
    private static void addMissingColumns(SQLiteDatabase db) {
        android.database.Cursor cur = db.rawQuery("PRAGMA table_info(dailyMetric)", null);
        java.util.Set<String> existing = new java.util.HashSet<>();
        while (cur.moveToNext()) existing.add(cur.getString(1));
        cur.close();
        if (!existing.contains("steps")) {
            db.execSQL("ALTER TABLE dailyMetric ADD COLUMN steps INTEGER");
            Log.i("OuraLocalDb", "Migration: added steps column to dailyMetric");
        }
        if (!existing.contains("skinTempMeanC")) {
            db.execSQL("ALTER TABLE dailyMetric ADD COLUMN skinTempMeanC REAL");
            Log.i("OuraLocalDb", "Migration: added skinTempMeanC column to dailyMetric");
        }
        android.database.Cursor spo2 = db.rawQuery("PRAGMA table_info(spo2Sample)", null);
        java.util.Set<String> spo2Columns = new java.util.HashSet<>();
        while (spo2.moveToNext()) spo2Columns.add(spo2.getString(1));
        spo2.close();
        if (!spo2Columns.contains("unit")) {
            db.execSQL("ALTER TABLE spo2Sample ADD COLUMN unit TEXT NOT NULL DEFAULT 'raw_adc'");
            Log.i("OuraLocalDb", "Migration: added unit column to spo2Sample");
        }
    }

    @Override
    public void onOpen(SQLiteDatabase db) {
        super.onOpen(db);
        ensureTablesCreated(db);
        addMissingColumns(db);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
    }

    private synchronized static void ensureTablesCreated(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS hrSample (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  bpm      INTEGER NOT NULL," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS rrInterval (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  rrMs     INTEGER NOT NULL," +
            "  PRIMARY KEY (deviceId, ts, rrMs)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS event (" +
            "  deviceId    TEXT NOT NULL," +
            "  ts          INTEGER NOT NULL," +
            "  kind        TEXT NOT NULL," +
            "  payloadJSON TEXT NOT NULL," +
            "  PRIMARY KEY (deviceId, ts, kind)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS spo2Sample (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  red      INTEGER NOT NULL," +
            "  ir       INTEGER NOT NULL," +
            "  unit     TEXT NOT NULL DEFAULT 'raw_adc'," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS skinTempSample (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  raw      INTEGER NOT NULL," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS sleepSession (" +
            "  deviceId    TEXT NOT NULL," +
            "  startTs     INTEGER NOT NULL," +
            "  endTs       INTEGER NOT NULL," +
            "  efficiency  REAL," +
            "  restingHr   INTEGER," +
            "  avgHrv      REAL," +
            "  stagesJSON  TEXT," +
            "  PRIMARY KEY (deviceId, startTs)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS dailyMetric (" +
            "  deviceId      TEXT NOT NULL," +
            "  day           TEXT NOT NULL," +
            "  totalSleepMin REAL," +
            "  efficiency    REAL," +
            "  deepMin       REAL," +
            "  remMin        REAL," +
            "  lightMin      REAL," +
            "  disturbances  INTEGER," +
            "  restingHr     INTEGER," +
            "  avgHrv        REAL," +
            "  recovery      REAL," +
            "  strain        REAL," +
            "  exerciseCount INTEGER," +
            "  spo2Pct       REAL," +
            "  skinTempDevC  REAL," +
            "  skinTempMeanC REAL," +
            "  respRateBpm   REAL," +
            "  steps         INTEGER," +
            "  PRIMARY KEY (deviceId, day)" +
            ")"
        );
    }
}
