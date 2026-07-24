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

        try {
            android.bluetooth.BluetoothDevice device = adapter.getRemoteDevice(address);
            if (activeDriver != null) {
                // disconnect previous
                activeDriver = null;
            }

            activeDriver = new OuraBleDriver(new OuraBleDriver.ConnectionCallback() {
                @Override
                public void onConnected() {
                    JSObject payload = new JSObject();
                    payload.put("connected", true);
                    payload.put("address", address);
                    notifyListeners("connectionStatus", payload);
                }

                @Override
                public void onDisconnected() {
                    JSObject payload = new JSObject();
                    payload.put("connected", false);
                    payload.put("address", address);
                    notifyListeners("connectionStatus", payload);
                }

                @Override
                public void onError(String message) {
                    JSObject payload = new JSObject();
                    payload.put("error", message);
                    notifyListeners("connectionError", payload);
                }

                @Override
                public void onNotificationReceived(byte[] data) {
                    if (data == null) return;
                    StringBuilder sb = new StringBuilder();
                    for (byte b : data) {
                        sb.append(String.format("%02x", b));
                    }
                    JSObject payload = new JSObject();
                    payload.put("hex", sb.toString());
                    payload.put("address", address);
                    notifyListeners("ouraBleNotification", payload);
                }
            });

            device.connectGatt(getContext(), false, activeDriver.gattCallback);
            JSObject ret = new JSObject();
            ret.put("connecting", true);
            ret.put("address", address);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("CONNECT_FAILED", e);
        }
    }

    @PluginMethod
    public void disconnectDevice(PluginCall call) {
        activeDriver = null;
        call.resolve();
    }

    @PluginMethod
    public void writeCommand(PluginCall call) {
        String hex = call.getString("hex");
        if (hex == null || hex.isEmpty()) {
            call.reject("HEX_REQUIRED");
            return;
        }
        if (activeDriver == null) {
            call.reject("NOT_CONNECTED");
            return;
        }

        int len = hex.length();
        byte[] bytes = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            bytes[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i+1), 16));
        }

        boolean ok = activeDriver.writeCommand(bytes);
        JSObject ret = new JSObject();
        ret.put("success", ok);
        call.resolve(ret);
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
