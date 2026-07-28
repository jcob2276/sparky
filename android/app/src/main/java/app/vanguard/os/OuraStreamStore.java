package app.vanguard.os;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;

import com.noop.data.BatteryRow;
import com.noop.data.EventEntry;
import com.noop.data.HrRow;
import com.noop.data.RrRow;
import com.noop.data.SkinTempRow;
import com.noop.data.Spo2Row;
import com.noop.data.StreamBatch;

/**
 * SQLite adapter for NOOP's WhoopRepository.insert(StreamBatch, deviceId).
 * The decoded batch and all natural-key conflict rules come directly from NOOP.
 */
public final class OuraStreamStore {
    private final OuraLocalDb dbHelper;

    public OuraStreamStore(OuraLocalDb dbHelper) {
        this.dbHelper = dbHelper;
    }

    public boolean insert(StreamBatch batch, String deviceId) {
        if (batch == null || deviceId == null) return false;
        boolean hasRows = !batch.getHr().isEmpty()
            || !batch.getRr().isEmpty()
            || !batch.getEvents().isEmpty()
            || !batch.getBattery().isEmpty()
            || !batch.getSpo2().isEmpty()
            || !batch.getSkinTemp().isEmpty();
        if (!hasRows) return false;

        SQLiteDatabase db = dbHelper.getWritableDatabase();
        boolean inserted = false;
        db.beginTransaction();
        try {
            SQLiteStatement hr = db.compileStatement(
                "INSERT OR IGNORE INTO hrSample (deviceId, ts, bpm) VALUES (?, ?, ?)");
            for (HrRow row : batch.getHr()) {
                hr.clearBindings();
                hr.bindString(1, deviceId);
                hr.bindLong(2, row.getTs());
                hr.bindLong(3, row.getBpm());
                inserted = hr.executeInsert() != -1L || inserted;
            }

            SQLiteStatement rr = db.compileStatement(
                "INSERT OR IGNORE INTO rrInterval (deviceId, ts, rrMs) VALUES (?, ?, ?)");
            for (RrRow row : batch.getRr()) {
                rr.clearBindings();
                rr.bindString(1, deviceId);
                rr.bindLong(2, row.getTs());
                rr.bindLong(3, row.getRrMs());
                inserted = rr.executeInsert() != -1L || inserted;
            }

            SQLiteStatement event = db.compileStatement(
                "INSERT OR IGNORE INTO event (deviceId, ts, kind, payloadJSON) VALUES (?, ?, ?, ?)");
            for (EventEntry row : batch.getEvents()) {
                event.clearBindings();
                event.bindString(1, deviceId);
                event.bindLong(2, row.getTs());
                event.bindString(3, row.getKind());
                event.bindString(4, row.getPayloadJSON());
                inserted = event.executeInsert() != -1L || inserted;
            }

            SQLiteStatement battery = db.compileStatement(
                "INSERT OR IGNORE INTO battery " +
                "(deviceId, ts, soc, mv, charging) VALUES (?, ?, ?, ?, ?)");
            for (BatteryRow row : batch.getBattery()) {
                battery.clearBindings();
                battery.bindString(1, deviceId);
                battery.bindLong(2, row.getTs());
                if (row.getSoc() == null) battery.bindNull(3);
                else battery.bindDouble(3, row.getSoc());
                if (row.getMv() == null) battery.bindNull(4);
                else battery.bindLong(4, row.getMv());
                if (row.getCharging() == null) battery.bindNull(5);
                else battery.bindLong(5, row.getCharging() ? 1L : 0L);
                inserted = battery.executeInsert() != -1L || inserted;
            }

            SQLiteStatement spo2 = db.compileStatement(
                "INSERT OR IGNORE INTO spo2Sample (deviceId, ts, red, ir) VALUES (?, ?, ?, ?)");
            for (Spo2Row row : batch.getSpo2()) {
                spo2.clearBindings();
                spo2.bindString(1, deviceId);
                spo2.bindLong(2, row.getTs());
                spo2.bindLong(3, row.getRed());
                spo2.bindLong(4, row.getIr());
                inserted = spo2.executeInsert() != -1L || inserted;
            }

            SQLiteStatement skinTemp = db.compileStatement(
                "INSERT OR IGNORE INTO skinTempSample (deviceId, ts, raw) VALUES (?, ?, ?)");
            for (SkinTempRow row : batch.getSkinTemp()) {
                skinTemp.clearBindings();
                skinTemp.bindString(1, deviceId);
                skinTemp.bindLong(2, row.getTs());
                skinTemp.bindLong(3, row.getRaw());
                inserted = skinTemp.executeInsert() != -1L || inserted;
            }

            db.setTransactionSuccessful();
            return inserted;
        } finally {
            db.endTransaction();
        }
    }
}
