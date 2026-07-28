package app.vanguard.os;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BleProbe",
    permissions = {
        @Permission(
            alias = "bluetoothScan",
            strings = { Manifest.permission.BLUETOOTH_SCAN }
        ),
        @Permission(
            alias = "bluetoothConnect",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        ),
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION }
        )
    }
)
public class BleProbePlugin extends Plugin {

    private BleScanSession session;

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        BluetoothAdapter adapter = getAdapter();
        ret.put("supported", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE));
        ret.put("enabled", adapter != null && adapter.isEnabled());
        ret.put("scanning", session != null && session.isScanning());
        ret.put("permissionsGranted", hasScanPermission() && hasConnectPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasScanPermission() && hasConnectPermission()) {
            call.resolve();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("bluetoothScan", call, "permissionsCallback");
        } else {
            requestPermissionForAlias("location", call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasConnectPermission()) {
            requestPermissionForAlias("bluetoothConnect", call, "connectPermissionsCallback");
            return;
        }
        if (hasScanPermission() && hasConnectPermission()) {
            call.resolve();
        } else {
            call.reject("BLE_PERMISSION_DENIED");
        }
    }

    @PermissionCallback
    private void connectPermissionsCallback(PluginCall call) {
        if (hasScanPermission() && hasConnectPermission()) {
            call.resolve();
        } else {
            call.reject("BLE_PERMISSION_DENIED");
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("BLUETOOTH_SETTINGS_UNAVAILABLE", e);
        }
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        if (!hasScanPermission() || !hasConnectPermission()) {
            call.reject("BLE_PERMISSION_DENIED");
            return;
        }
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("BLUETOOTH_OFF");
            return;
        }

        Integer durationMs = call.getInt("durationMs");
        int duration = durationMs != null ? durationMs : 12000;

        if (session != null) {
            session.stop();
        }
        session = new BleScanSession(getContext(), new BleScanSession.Listener() {
            @Override
            public void onDeviceFound(JSObject device) {
                notifyListeners("deviceFound", device);
            }

            @Override
            public void onScanFinished(JSArray devices, boolean ouraSeen) {
                JSObject payload = new JSObject();
                payload.put("devices", devices);
                payload.put("ouraSeen", ouraSeen);
                payload.put("count", devices.length());
                notifyListeners("scanFinished", payload);
            }
        });

        try {
            session.start(duration);
            JSObject ret = new JSObject();
            ret.put("durationMs", duration);
            call.resolve(ret);
        } catch (IllegalStateException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        if (session != null) {
            session.stop();
        }
        call.resolve();
    }

    @PluginMethod
    public void getLastResults(PluginCall call) {
        JSArray devices = session != null ? session.snapshot() : new JSArray();
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        ret.put("count", devices.length());
        call.resolve(ret);
    }

    private OuraBleDriver activeDriver;

    @PluginMethod
    public void connectDevice(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("ADDRESS_REQUIRED");
            return;
        }
        if (!hasConnectPermission()) {
            call.reject("BLE_PERMISSION_DENIED");
            return;
        }
        BluetoothAdapter adapter = getAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("BLUETOOTH_OFF");
            return;
        }

        // Start background service (idempotent — safe to call multiple times)
        OuraForegroundService.start(getContext(), address);

        // Build the JS-bridge callback once
        OuraBleDriver.ConnectionCallback pluginCallback = buildPluginCallback(address);

        // Attach callback to service driver (the single owner of the GATT connection).
        // If service hasn't started yet, retry once after 500ms — it's always fast.
        attachToServiceDriver(pluginCallback, address, 0);

        JSObject ret = new JSObject();
        ret.put("connecting", true);
        ret.put("address", address);
        call.resolve(ret);
    }

    private OuraBleDriver.ConnectionCallback buildPluginCallback(String address) {
        return new OuraBleDriver.ConnectionCallback() {
            @Override public void onConnected() {
                JSObject p = new JSObject(); p.put("connected", true); p.put("address", address);
                notifyListeners("connectionStatus", p);
            }
            @Override public void onDisconnected() {
                JSObject p = new JSObject(); p.put("connected", false); p.put("address", address);
                notifyListeners("connectionStatus", p);
            }
            @Override public void onError(String message) {
                JSObject p = new JSObject(); p.put("error", message);
                notifyListeners("connectionError", p);
            }
            @Override public void onLiveHrReceived(int bpm, int ibiMs) {
                JSObject p = new JSObject(); p.put("bpm", bpm); p.put("ibiMs", ibiMs); p.put("address", address);
                notifyListeners("ouraLiveHr", p);
            }
            @Override public void onBatteryReceived(int percent) {
                JSObject p = new JSObject(); p.put("percent", percent); p.put("address", address);
                notifyListeners("ouraBattery", p);
            }
            @Override public void onDataFlushed() {
                JSObject p = new JSObject(); p.put("source", "ble"); p.put("address", address);
                notifyListeners("ouraDataUpdated", p);
                android.util.Log.i("BleProbePlugin", "ouraDataUpdated fired for " + address);
            }
        };
    }

    private void attachToServiceDriver(OuraBleDriver.ConnectionCallback cb, String address, int attempt) {
        OuraForegroundService svc = OuraForegroundService.getInstance();
        if (svc != null && svc.getBleDriver() != null) {
            activeDriver = svc.getBleDriver();
            activeDriver.setExtraCallback(cb);
            android.util.Log.i("BleProbePlugin", "Attached plugin callback to service driver (attempt " + attempt + ")");
        } else if (attempt < 3) {
            // Service not ready yet — retry after 500ms (happens only on very first cold start)
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
                () -> attachToServiceDriver(cb, address, attempt + 1), 500);
        } else {
            android.util.Log.w("BleProbePlugin", "Service not ready after retries — skipping plugin callback attach");
        }
    }

    @PluginMethod
    public void adoptDevice(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("ADDRESS_REQUIRED");
            return;
        }
        if (!hasConnectPermission()) {
            call.reject("BLE_PERMISSION_DENIED");
            return;
        }

        com.noop.ble.OuraInstallKeyStore.INSTANCE.setPendingAdopt(
            getContext(),
            "oura:" + address,
            true
        );
        if (activeDriver != null) {
            activeDriver.disconnect();
            activeDriver = null;
        }
        OuraForegroundService.stop(getContext());
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            OuraForegroundService.start(getContext(), address);
            attachToServiceDriver(buildPluginCallback(address), address, 0);
        }, 500L);

        JSObject result = new JSObject();
        result.put("adopting", true);
        result.put("address", address);
        call.resolve(result);
    }

    @PluginMethod
    public void disconnectDevice(PluginCall call) {
        if (activeDriver != null) {
            activeDriver.disconnect();
            activeDriver = null;
        }
        OuraForegroundService.stop(getContext());
        getContext().getSharedPreferences("vanguard_oura_ble", Context.MODE_PRIVATE)
            .edit().remove("device_address").apply();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (session != null) {
            session.stop();
            session = null;
        }
        super.handleOnDestroy();
    }

    private BluetoothAdapter getAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : null;
    }

    private boolean hasScanPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN)
                == PackageManager.PERMISSION_GRANTED;
        }
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasConnectPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT)
                == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
}
