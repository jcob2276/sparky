package app.vanguard.os;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;

import com.getcapacitor.JSObject;

/** Default-network type + labelled Wi-Fi (home / work / other). The SSID never leaves the device. */
final class DeviceNetworkTracker {

    private final Context app;
    private final Handler handler;
    private ConnectivityManager.NetworkCallback netCallback;
    private NetworkCapabilities lastCaps;
    private String lastNetKey = "";

    DeviceNetworkTracker(Context app, Handler handler) {
        this.app = app;
        this.handler = handler;
    }

    /** Re-evaluates the current Wi-Fi label (after the user labels the network). */
    void refresh() {
        lastNetKey = "";
        if (lastCaps != null) handleNetwork(lastCaps);
    }

    void sync(boolean on) {
        ConnectivityManager cm = (ConnectivityManager) app.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;
        if (on && netCallback == null) {
            netCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) {
                    lastCaps = caps;
                    handleNetwork(caps);
                }

                @Override
                public void onLost(Network network) {
                    lastCaps = null;
                    handleNetwork(null);
                }
            };
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    cm.registerDefaultNetworkCallback(netCallback, handler);
                } else {
                    cm.registerDefaultNetworkCallback(netCallback);
                }
            } catch (SecurityException e) {
                netCallback = null;
            }
        } else if (!on && netCallback != null) {
            try {
                cm.unregisterNetworkCallback(netCallback);
            } catch (IllegalArgumentException ignored) {
                // already unregistered
            }
            netCallback = null;
        }
    }

    private synchronized void handleNetwork(NetworkCapabilities caps) {
        String type = "none";
        boolean metered = false;
        String label = null;
        if (caps != null) {
            metered = !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED);
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                type = "wifi";
                label = DeviceSignalConfig.wifiLabelFor(app, currentSsid());
            } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                type = "cell";
            } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                type = "eth";
            } else {
                type = "other";
            }
        }
        String key = type + "|" + label + "|" + metered;
        if (key.equals(lastNetKey)) return;
        lastNetKey = key;
        JSObject p = new JSObject();
        p.put("t", type);
        p.put("lbl", label);
        p.put("metered", metered);
        DeviceSignalQueue.add(app, "network", System.currentTimeMillis(), p);
    }

    /** Current Wi-Fi SSID, or null when unavailable (needs location permission + location on). */
    String currentSsid() {
        try {
            WifiManager wm = (WifiManager) app.getSystemService(Context.WIFI_SERVICE);
            if (wm == null) return null;
            @SuppressWarnings("deprecation")
            WifiInfo info = wm.getConnectionInfo();
            if (info == null) return null;
            String ssid = info.getSSID();
            if (ssid == null || ssid.isEmpty() || "<unknown ssid>".equals(ssid)) return null;
            if (ssid.length() > 1 && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                ssid = ssid.substring(1, ssid.length() - 1);
            }
            return ssid;
        } catch (SecurityException e) {
            return null;
        }
    }
}
