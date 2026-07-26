package app.vanguard.os;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

final class BleScanSession {

    interface Listener {
        void onDeviceFound(JSObject device);
        void onScanFinished(JSArray devices, boolean ouraSeen);
    }

    private final Context context;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, JSObject> devices = new LinkedHashMap<>();
    private BluetoothLeScanner scanner;
    private ScanCallback callback;
    private Runnable stopRunnable;

    BleScanSession(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
    }

    boolean isScanning() {
        return callback != null;
    }

    void start(int durationMs) {
        stopInternal(false);
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            throw new IllegalStateException("BLUETOOTH_OFF");
        }
        if (!hasScanPermission()) {
            throw new IllegalStateException("BLE_PERMISSION_DENIED");
        }

        scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            throw new IllegalStateException("BLE_SCANNER_UNAVAILABLE");
        }

        devices.clear();
        addBondedOuraDevices(adapter);
        callback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                handleResult(result);
            }

            @Override
            public void onBatchScanResults(java.util.List<ScanResult> results) {
                for (ScanResult result : results) {
                    handleResult(result);
                }
            }

            @Override
            public void onScanFailed(int errorCode) {
                stopInternal(true);
            }
        };

        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();
        ScanFilter ouraServiceFilter = new ScanFilter.Builder()
            .setServiceUuid(new ParcelUuid(UUID.fromString(OuraBleMarkers.SERVICE_UUID)))
            .build();
        scanner.startScan(Collections.singletonList(ouraServiceFilter), settings, callback);

        stopRunnable = () -> stopInternal(true);
        handler.postDelayed(stopRunnable, Math.max(3000, durationMs));
    }

    private void addBondedOuraDevices(BluetoothAdapter adapter) {
        try {
            for (android.bluetooth.BluetoothDevice bonded : adapter.getBondedDevices()) {
                String name = bonded.getName();
                String address = bonded.getAddress();
                if (!OuraBleMarkers.isOuraName(name) || address == null) continue;

                JSObject device = new JSObject();
                device.put("address", address);
                device.put("name", name);
                device.put("rssi", 0);
                device.put("ouraLike", true);
                device.put("bonded", true);
                devices.put(address, device);
                android.util.Log.i(
                    "BleScanSession",
                    "Found bonded Oura device address=" + address + " name=" + name
                );
                listener.onDeviceFound(device);
            }
        } catch (SecurityException e) {
            android.util.Log.w("BleScanSession", "Cannot read bonded Oura devices", e);
        }
    }

    void stop() {
        stopInternal(true);
    }

    JSArray snapshot() {
        JSArray array = new JSArray();
        for (JSObject device : devices.values()) {
            array.put(device);
        }
        return array;
    }

    private void stopInternal(boolean notify) {
        if (stopRunnable != null) {
            handler.removeCallbacks(stopRunnable);
            stopRunnable = null;
        }
        if (scanner != null && callback != null) {
            try {
                scanner.stopScan(callback);
            } catch (Exception ignored) {
                /* scanner may already be stopped */
            }
        }
        callback = null;
        scanner = null;

        if (notify) {
            boolean ouraSeen = false;
            for (JSObject device : devices.values()) {
                if (device.getBoolean("ouraLike", false)) {
                    ouraSeen = true;
                    break;
                }
            }
            listener.onScanFinished(snapshot(), ouraSeen);
        }
    }

    private void handleResult(ScanResult result) {
        if (result == null || result.getDevice() == null) return;
        String address = result.getDevice().getAddress();
        if (address == null) return;

        String name = result.getDevice().getName();
        if (name == null && result.getScanRecord() != null) {
            name = result.getScanRecord().getDeviceName();
        }
        java.util.List<android.os.ParcelUuid> serviceUuids = result.getScanRecord() != null
            ? result.getScanRecord().getServiceUuids()
            : null;
        android.util.SparseArray<byte[]> manufacturerData = result.getScanRecord() != null
            ? result.getScanRecord().getManufacturerSpecificData()
            : null;
        boolean ouraLike = OuraBleMarkers.isOuraLike(name, serviceUuids, manufacturerData);

        // Gen 3/4 often advertises with no name — only service UUID
        if (name == null && ouraLike) name = "Oura Ring";
        if (ouraLike) {
            android.util.Log.i(
                "BleScanSession",
                "Verified Oura advertisement address=" + address
                    + " name=" + name
                    + " rssi=" + result.getRssi()
                    + " serviceUuids=" + serviceUuids
                    + " manufacturerIds=" + manufacturerIds(manufacturerData)
            );
        }

        JSObject device = new JSObject();
        device.put("address", address);
        device.put("name", name != null ? name : "(bez nazwy)");
        device.put("rssi", result.getRssi());
        device.put("ouraLike", ouraLike);

        devices.put(address, device);
        listener.onDeviceFound(device);
    }

    private static String manufacturerIds(android.util.SparseArray<byte[]> data) {
        if (data == null || data.size() == 0) return "[]";
        StringBuilder ids = new StringBuilder("[");
        for (int i = 0; i < data.size(); i++) {
            if (i > 0) ids.append(',');
            ids.append(String.format("0x%04X", data.keyAt(i)));
        }
        return ids.append(']').toString();
    }

    private BluetoothAdapter getAdapter() {
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : null;
    }

    private boolean hasScanPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN)
                == PackageManager.PERMISSION_GRANTED;
        }
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }
}
