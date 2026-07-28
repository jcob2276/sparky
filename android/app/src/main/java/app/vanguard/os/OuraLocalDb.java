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
 *
 * All ts values are wall-clock unix SECONDS (long).
 * INSERT OR IGNORE on the PK = ON CONFLICT DO NOTHING (noop parity).
 * WAL mode: reads run concurrently with the BLE write path.
 */
public class OuraLocalDb extends SQLiteOpenHelper {

    private static final String TAG = "OuraLocalDb";
    private static final String DB_NAME = "vanguard_oura.db";
    private static final int DB_VERSION = 5;

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
        addColumnIfMissing(db, "hrSample", "synced", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing(db, "rrInterval", "synced", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing(db, "event", "synced", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing(db, "spo2Sample", "synced", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing(db, "skinTempSample", "synced", "INTEGER NOT NULL DEFAULT 0");
        removeLegacySpo2UnitColumn(db);
    }

    private static void addColumnIfMissing(
        SQLiteDatabase db,
        String table,
        String column,
        String declaration
    ) {
        android.database.Cursor cursor = db.rawQuery("PRAGMA table_info(" + table + ")", null);
        boolean present = false;
        while (cursor.moveToNext()) {
            if (column.equals(cursor.getString(1))) {
                present = true;
                break;
            }
        }
        cursor.close();
        if (!present) db.execSQL(
            "ALTER TABLE " + table + " ADD COLUMN " + column + " " + declaration
        );
    }

    private static void removeLegacySpo2UnitColumn(SQLiteDatabase db) {
        android.database.Cursor cursor = db.rawQuery("PRAGMA table_info(spo2Sample)", null);
        boolean hasLegacyUnit = false;
        while (cursor.moveToNext()) {
            if ("unit".equals(cursor.getString(1))) {
                hasLegacyUnit = true;
                break;
            }
        }
        cursor.close();
        if (!hasLegacyUnit) return;

        boolean ownsTransaction = !db.inTransaction();
        if (ownsTransaction) db.beginTransaction();
        try {
            db.execSQL(
                "CREATE TABLE spo2Sample_noop (" +
                "deviceId TEXT NOT NULL, ts INTEGER NOT NULL, red INTEGER NOT NULL, " +
                "ir INTEGER NOT NULL, synced INTEGER NOT NULL DEFAULT 0, " +
                "PRIMARY KEY (deviceId, ts))"
            );
            db.execSQL(
                "INSERT OR IGNORE INTO spo2Sample_noop (deviceId, ts, red, ir, synced) " +
                "SELECT deviceId, ts, red, ir, synced FROM spo2Sample"
            );
            db.execSQL("DROP TABLE spo2Sample");
            db.execSQL("ALTER TABLE spo2Sample_noop RENAME TO spo2Sample");
            if (ownsTransaction) db.setTransactionSuccessful();
        } finally {
            if (ownsTransaction) db.endTransaction();
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
            "  synced   INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS rrInterval (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  rrMs     INTEGER NOT NULL," +
            "  synced   INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts, rrMs)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS event (" +
            "  deviceId    TEXT NOT NULL," +
            "  ts          INTEGER NOT NULL," +
            "  kind        TEXT NOT NULL," +
            "  payloadJSON TEXT NOT NULL," +
            "  synced      INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts, kind)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS battery (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  soc      REAL," +
            "  mv       INTEGER," +
            "  charging INTEGER," +
            "  synced   INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS spo2Sample (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  red      INTEGER NOT NULL," +
            "  ir       INTEGER NOT NULL," +
            "  synced   INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS skinTempSample (" +
            "  deviceId TEXT NOT NULL," +
            "  ts       INTEGER NOT NULL," +
            "  raw      INTEGER NOT NULL," +
            "  synced   INTEGER NOT NULL DEFAULT 0," +
            "  PRIMARY KEY (deviceId, ts)" +
            ")"
        );
    }
}
