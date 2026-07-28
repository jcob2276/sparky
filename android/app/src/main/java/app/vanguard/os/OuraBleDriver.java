package app.vanguard.os;

import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.UUID;
import com.noop.oura.GetEventsSummary;
import com.noop.protocol.Streams;
import com.noop.data.StreamBatch;
import com.noop.data.StreamPersistence;
import com.noop.ble.OuraHistoryCursorStore;
import com.noop.ble.OuraInstallKeyStore;
import com.noop.oura.OuraGatt;

/**
 * Oura Ring BLE GATT driver with application-level auth handshake,
 * 1Hz Live HR streaming (Daytime HR), and GetEvents history fetch decoders.
 *
 * Auth flow per OURA_PROTOCOL.md §3:
 *   1. CCCD write confirmed
 *   2. Send GetAuthNonce: 2f 01 2b
 *   3. Ring replies with nonce: 2f 10 2c <nonce:15 bytes>
 *   4. Compute AES-ECB proof and send: 2f 11 2d <proof:16 bytes>
 *   5. Ring replies: 2f 02 2e 00 (success) or 2f 02 2e 01 / 02 / 03
 *   6. A key may be installed only after one-shot, explicit adoption consent.
 *      Then ring replies: 25 01 00 -> persist the key and retry auth from step 2.
 *   7. After auth success -> send battery request (0c 00), enable Live HR or fetch history.
 */
public class OuraBleDriver {
    private static final String TAG = "OuraBleDriver";

    public static final UUID SERVICE_UUID     = UUID.fromString(OuraGatt.serviceUUID);
    public static final UUID WRITE_CHAR_UUID  = UUID.fromString(OuraGatt.writeCharacteristicUUID);
    public static final UUID NOTIFY_CHAR_UUID = UUID.fromString(OuraGatt.notifyCharacteristicUUID);
    public static final UUID CCCD_UUID        = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    public static final int MTU_GEN3 = OuraGatt.mtuGen3;

    private enum AuthState { IDLE, NONCE_SENT, KEY_INSTALLING, AUTHENTICATED }
    private AuthState authState = AuthState.IDLE;
    private byte[] authKey;
    private NoopOuraBridge noopProtocol;
    private byte[] pendingInstallKey;
    private boolean adoptConsent;
    private boolean liveHrActive = false;

    public interface ConnectionCallback {
        void onConnected();
        void onDisconnected();
        void onError(String message);
        void onLiveHrReceived(int bpm, int ibiMs);
        default void onBatteryReceived(int percent) {}
        /** Fired once after each history-fetch flush completes (lightweight UI refresh signal). */
        void onDataFlushed();
    }

    private final ConnectionCallback callback;
    private ConnectionCallback extraCallback;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private BluetoothGatt bluetoothGatt;
    private final Runnable liveHrReengage = new Runnable() {
        @Override public void run() {
            if (authState == AuthState.AUTHENTICATED && liveHrActive) {
                for (byte[] command : noopProtocol.reengageLiveHrCommands()) {
                    writeCommand(command);
                }
                mainHandler.postDelayed(this, 15_000L);
            }
        }
    };
    private long historyCursor;
    private boolean historyFetchInProgress;
    private boolean initialHistoryRequested;
    private Context appContext;
    private android.bluetooth.BluetoothDevice targetDevice;
    private boolean intentionalDisconnect;
    private int failedReconnectAttempts;
    private boolean retriedGatt133;
    private final Runnable reconnectRunnable = () -> {
        if (!intentionalDisconnect && bluetoothGatt == null && appContext != null && targetDevice != null) {
            Log.i(TAG, "Retrying direct Oura GATT connection");
            openGatt();
        }
    };

    public void setExtraCallback(ConnectionCallback extraCallback) {
        this.extraCallback = extraCallback;
        // The foreground service can already own an authenticated GATT session
        // before the WebView opens the settings panel. Replay the current state
        // so a late JS listener does not remain stuck on "connecting".
        if (extraCallback != null && authState == AuthState.AUTHENTICATED) {
            extraCallback.onConnected();
        }
    }

    private void notifyConnected() {
        if (callback != null) callback.onConnected();
        if (extraCallback != null) extraCallback.onConnected();
    }

    private void notifyDisconnected() {
        if (callback != null) callback.onDisconnected();
        if (extraCallback != null) extraCallback.onDisconnected();
    }

    private void notifyError(String message) {
        if (callback != null) callback.onError(message);
        if (extraCallback != null) extraCallback.onError(message);
    }

    private void notifyLiveHr(int bpm, int ibiMs) {
        if (callback != null) callback.onLiveHrReceived(bpm, ibiMs);
        if (extraCallback != null) extraCallback.onLiveHrReceived(bpm, ibiMs);
    }

    private void notifyBattery(int percent) {
        if (callback != null) callback.onBatteryReceived(percent);
        if (extraCallback != null) extraCallback.onBatteryReceived(percent);
    }

    private void notifyDataFlushed() {
        if (callback != null) callback.onDataFlushed();
        if (extraCallback != null) extraCallback.onDataFlushed();
    }

    private void persistNoopStreams(Streams streams) {
        if (streams == null) return;
        boolean persisted = false;
        for (Streams buffered : persistBuffer.enqueue(streams)) {
            persisted = persistNoopStreamsNow(buffered) || persisted;
        }
        if (persisted) notifyDataFlushed();
    }

    private void flushNoopStreams() {
        boolean persisted = false;
        for (Streams buffered : persistBuffer.flush()) {
            persisted = persistNoopStreamsNow(buffered) || persisted;
        }
        if (persisted) notifyDataFlushed();
    }

    private boolean persistNoopStreamsNow(Streams streams) {
        if (streamStore == null) return false;
        StreamBatch batch = StreamPersistence.INSTANCE.toBatch(streams);
        return streamStore.insert(batch, deviceId);
    }

    // ── Local SQLite store (noop OuraStreamStore parity) ──────────────────
    private OuraStreamStore streamStore;
    private final NoopOuraPersistBuffer persistBuffer = new NoopOuraPersistBuffer();
    /** device id key for this ring — set at connect time */
    private String deviceId = "oura-ring";

    public OuraBleDriver(ConnectionCallback callback) {
        this.callback = callback;
    }

    private static int[] toUnsignedInts(byte[] bytes) {
        if (bytes == null) return null;
        int[] values = new int[bytes.length];
        for (int i = 0; i < bytes.length; i++) values[i] = bytes[i] & 0xff;
        return values;
    }

    private static byte[] toBytes(int[] values) {
        if (values == null) return null;
        byte[] bytes = new byte[values.length];
        for (int i = 0; i < values.length; i++) bytes[i] = (byte) values[i];
        return bytes;
    }

    private NoopOuraBridge createNoopProtocol() {
        return new NoopOuraBridge(toUnsignedInts(authKey), true, adoptConsent);
    }

    private void handleNeedsKeyInstall() {
        if (adoptConsent && pendingInstallKey != null) {
            byte[] install = noopProtocol.beginKeyInstall(toUnsignedInts(pendingInstallKey));
            if (install != null) {
                authState = AuthState.KEY_INSTALLING;
                writeCommand(install);
                return;
            }
        }
        stopReconnectForPairing();
        notifyError("Pierścień wymaga świadomego ponownego sparowania");
    }

    private void stopReconnectForPairing() {
        intentionalDisconnect = true;
        targetDevice = null;
        failedReconnectAttempts = 0;
        pendingInstallKey = null;
        mainHandler.removeCallbacks(reconnectRunnable);
    }

    /**
     * Attach the local SQLite store so decoded samples are persisted directly
     * without routing through the JS bridge. Call before connect.
     */
    public void attachStore(Context ctx, String ringDeviceId) {
        this.streamStore = new OuraStreamStore(OuraLocalDb.get(ctx));
        this.deviceId    = ringDeviceId;
        this.historyCursor = OuraHistoryCursorStore.INSTANCE.read(ctx, ringDeviceId);
        int[] noopKey = OuraInstallKeyStore.INSTANCE.load(ctx, ringDeviceId);
        if (noopKey == null) {
            byte[] legacyKey = OuraAuthKeyStore.load(ctx, ringDeviceId);
            if (legacyKey != null) {
                int[] migrated = toUnsignedInts(legacyKey);
                if (OuraInstallKeyStore.INSTANCE.save(ctx, ringDeviceId, migrated)) {
                    noopKey = migrated;
                }
            }
        }
        this.authKey = noopKey == null ? null : toBytes(noopKey);
        this.adoptConsent = OuraInstallKeyStore.INSTANCE.consumePendingAdopt(ctx, ringDeviceId);
        this.noopProtocol = createNoopProtocol();
        if (adoptConsent) {
            this.pendingInstallKey = new byte[OuraInstallKeyStore.KEY_LENGTH];
            new SecureRandom().nextBytes(this.pendingInstallKey);
        } else {
            this.pendingInstallKey = null;
        }
    }

    public void connectDevice(Context ctx, android.bluetooth.BluetoothDevice device) {
        if (device == null) return;
        intentionalDisconnect = true;
        closeGatt();
        this.appContext = ctx.getApplicationContext();
        this.targetDevice = device;
        intentionalDisconnect = false;
        failedReconnectAttempts = 0;
        retriedGatt133 = false;
        Log.i(TAG, "Connecting directly to Oura Ring " + device.getAddress() + "...");
        openGatt();
    }

    private void openGatt() {
        mainHandler.removeCallbacks(reconnectRunnable);
        if (appContext == null || targetDevice == null || intentionalDisconnect) return;
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                bluetoothGatt = targetDevice.connectGatt(
                    appContext, false, gattCallback, android.bluetooth.BluetoothDevice.TRANSPORT_LE);
            } else {
                bluetoothGatt = targetDevice.connectGatt(appContext, false, gattCallback);
            }
        } catch (RuntimeException error) {
            Log.e(TAG, "Failed to open Oura GATT connection", error);
            bluetoothGatt = null;
            notifyError("Nie udało się otworzyć połączenia BLE z pierścieniem");
        }
    }

    public void connectDevice(Context ctx, String macAddress) {
        if (macAddress == null || macAddress.isEmpty()) return;
        android.bluetooth.BluetoothManager bm = (android.bluetooth.BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bm == null || bm.getAdapter() == null) return;
        try {
            connectDevice(ctx, bm.getAdapter().getRemoteDevice(macAddress));
        } catch (Exception e) {
            Log.e(TAG, "Failed to get remote device: " + e.getMessage());
        }
    }

    public void disconnect() {
        intentionalDisconnect = true;
        mainHandler.removeCallbacks(reconnectRunnable);
        liveHrActive = false;
        closeGatt();
        targetDevice = null;
        appContext = null;
        authState = AuthState.IDLE;
        historyFetchInProgress = false;
        initialHistoryRequested = false;
        if (noopProtocol != null) {
            for (Streams batch : noopProtocol.drainAtTeardownBatches(
                (int) (System.currentTimeMillis() / 1000L)
            )) persistNoopStreams(batch);
            noopProtocol.reset();
        }
        flushNoopStreams();
        mainHandler.removeCallbacks(liveHrReengage);
        failedReconnectAttempts = 0;
        retriedGatt133 = false;
    }

    private void closeGatt() {
        if (bluetoothGatt != null) {
            try {
                bluetoothGatt.disconnect();
                bluetoothGatt.close();
            } catch (Exception ignored) {}
            bluetoothGatt = null;
        }
    }

    public void fetchHistory() {
        if (authState != AuthState.AUTHENTICATED) return;
        if (historyFetchInProgress) return;
        historyFetchInProgress = true;
        Log.i(TAG, "Fetching Oura history from persisted cursor " + historyCursor);
        for (byte[] command : noopProtocol.startHistory(historyCursor)) {
            writeCommand(command);
        }
    }

    public final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {

        @Override
        public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
            if (gatt != bluetoothGatt) {
                try { gatt.close(); } catch (Exception ignored) {}
                return;
            }
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.i(TAG, "GATT connected (status=" + status + "). Discovering services...");
                bluetoothGatt = gatt;
                failedReconnectAttempts = 0;
                retriedGatt133 = false;
                authState = AuthState.IDLE;
                historyFetchInProgress = false;
                initialHistoryRequested = false;
                if (noopProtocol != null) noopProtocol.reset();
                noopProtocol = createNoopProtocol();
                mainHandler.removeCallbacks(liveHrReengage);
                gatt.discoverServices();
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.i(TAG, "GATT disconnected (status=" + status + ")");
                try { gatt.close(); } catch (Exception ignored) {}
                bluetoothGatt = null;
                authState = AuthState.IDLE;
                liveHrActive = false;
                historyFetchInProgress = false;
                if (noopProtocol != null) {
                    for (Streams batch : noopProtocol.drainAtTeardownBatches(
                        (int) (System.currentTimeMillis() / 1000L)
                    )) persistNoopStreams(batch);
                    noopProtocol.reset();
                }
                flushNoopStreams();
                mainHandler.removeCallbacks(liveHrReengage);
                notifyDisconnected();
                if (OuraBleProtocol.shouldReconnect(intentionalDisconnect, targetDevice != null)) {
                    mainHandler.removeCallbacks(reconnectRunnable);
                    if (status == 133 && !retriedGatt133) {
                        retriedGatt133 = true;
                        Log.w(TAG, "GATT 133; retrying once in 1s");
                        mainHandler.postDelayed(reconnectRunnable, 1_000L);
                    } else {
                        failedReconnectAttempts++;
                        long delay = NoopOuraTransport.reconnectDelayMs(failedReconnectAttempts);
                        Log.i(TAG, "Reconnecting in " + (delay / 1000L)
                            + "s (attempt " + failedReconnectAttempts + ")");
                        mainHandler.postDelayed(reconnectRunnable, delay);
                    }
                }
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt gatt, int status) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "Service discovery failed: " + status);
                notifyError("Service discovery failed: " + status);
                return;
            }
            BluetoothGattService service = gatt.getService(SERVICE_UUID);
            if (service == null) {
                Log.e(TAG, "Oura primary service not found after discovery");
                stopReconnectForPairing();
                notifyError("Oura primary service missing");
                return;
            }
            Log.i(TAG, "Oura service found. Requesting MTU " + MTU_GEN3);
            boolean mtuRequestAccepted;
            try {
                mtuRequestAccepted = gatt.requestMtu(MTU_GEN3);
            } catch (RuntimeException error) {
                Log.w(TAG, "MTU request failed; continuing with default MTU", error);
                mtuRequestAccepted = false;
            }
            if (OuraBleProtocol.shouldEnableNotificationsImmediately(mtuRequestAccepted)) {
                Log.w(TAG, "MTU request rejected by Android; continuing with default MTU");
                enableNotifications(gatt);
            }
        }

        @Override
        public void onMtuChanged(BluetoothGatt gatt, int mtu, int status) {
            Log.i(TAG, "MTU=" + mtu + " status=" + status + ". Enabling notifications...");
            enableNotifications(gatt);
        }

        @Override
        public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
            if (!CCCD_UUID.equals(descriptor.getUuid())) return;

            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.i(TAG, "CCCD write confirmed. Starting auth handshake...");
                authState = AuthState.NONCE_SENT;
                boolean ok = true;
                for (byte[] command : noopProtocol.readyCommands()) {
                    ok = writeCommand(command) && ok;
                }
                if (noopProtocol.needsKeyInstall()) handleNeedsKeyInstall();
                Log.i(TAG, "Ring notifications enabled; GetAuthNonce queued: " + ok);
            } else {
                Log.e(TAG, "CCCD write failed: " + status);
                stopReconnectForPairing();
                notifyError("Failed to enable notifications: " + status);
            }
        }

        private synchronized void handleNotification(byte[] fragment) {
            if (fragment == null || fragment.length == 0) return;
            for (byte[] frame : NoopOuraBridge.splitOuterFrames(fragment)) {
                handleFrame(frame);
            }
        }

        private void handleFrame(byte[] value) {
            if (value == null || value.length < 2) return;

            int op = value[0] & 0xFF;

            if (op == 0x0D) {
                Integer percent = NoopOuraBridge.decodeBatteryPercent(value);
                if (percent != null && percent >= 0 && percent <= 100) {
                    notifyBattery(percent);
                    // NOOP enqueues the battery event even though OuraStreamMapping intentionally
                    // produces no durable battery row; it still counts as one buffer batch.
                    persistNoopStreams(new Streams());
                }
                return;
            }

            // 0x11 = GetEvents Summary: 11 <len> <status:1> <sub_status:1> <cursor:4 LE> <pad:2>
            if (op == 0x11 && value.length >= 8) {
                GetEventsSummary summary = NoopOuraBridge.parseGetEventsFrame(value);
                if (summary == null) return;
                if (summary.getMoreData()) {
                    if (summary.getCursor() < historyCursor) {
                        historyCursor = 0L;
                    } else {
                        historyCursor = summary.getCursor();
                    }
                    if (appContext != null) {
                        OuraHistoryCursorStore.INSTANCE.save(appContext, deviceId, historyCursor);
                    }
                }
                Log.i(TAG, "GetEventsSummary moreData=" + summary.getMoreData()
                    + " cursor=" + historyCursor);
                for (byte[] command : noopProtocol.advanceHistory(summary)) writeCommand(command);
                if (!summary.getMoreData()) {
                    historyFetchInProgress = false;
                    Log.i(TAG, "All Oura history pages fetched");
                }
                return;
            }
            // 0x2F is routed exclusively through NOOP's OuraDriver state machine.
            if (op == 0x2F && value.length >= 3) {
                NoopOuraBridge.SecureResult result = noopProtocol.handleSecureFrame(
                    value, (int) (System.currentTimeMillis() / 1000L)
                );
                for (byte[] command : result.getCommands()) writeCommand(command);
                for (Streams batch : result.getStreamBatches()) persistNoopStreams(batch);
                Integer liveBpm = result.getLiveBpm();
                Integer liveIbi = result.getLiveIbiMs();
                boolean publishHr = liveBpm != null
                    && OuraBleProtocol.shouldPublishLiveHr(liveBpm);
                boolean publishIbi = liveIbi != null
                    && OuraBleProtocol.shouldPublishLiveIbi(liveIbi);
                if (publishHr || publishIbi) {
                    notifyLiveHr(publishHr ? liveBpm : 0, publishIbi ? liveIbi : 0);
                }
                if (result.getStreaming()) {
                    boolean firstStreaming = authState != AuthState.AUTHENTICATED;
                    authState = AuthState.AUTHENTICATED;
                    if (firstStreaming) {
                        liveHrActive = true;
                        mainHandler.postDelayed(liveHrReengage, 15_000L);
                        notifyConnected();
                        writeCommand(noopProtocol.batteryCommand());
                        if (!initialHistoryRequested) {
                            initialHistoryRequested = true;
                            fetchHistory();
                        }
                    }
                } else if (result.getNeedsKeyInstall()) {
                    handleNeedsKeyInstall();
                } else if (result.getAuthFailed()) {
                    stopReconnectForPairing();
                    notifyError("Klucz aplikacji nie pasuje do tego pierścienia");
                }
                return;
            }
            // 0x25 = SetAuthKey response: 25 01 <status>
            if (op == 0x25 && value.length >= 3) {
                int keyStatus = value[2] & 0xFF;
                Log.i(TAG, "SetAuthKey response: status=0x" + String.format("%02x", keyStatus));
                if (keyStatus == 0x00 && authState == AuthState.KEY_INSTALLING) {
                    if (appContext == null || pendingInstallKey == null
                        || !OuraInstallKeyStore.INSTANCE.save(
                            appContext,
                            deviceId,
                            toUnsignedInts(pendingInstallKey)
                        )) {
                        stopReconnectForPairing();
                        notifyError("Klucz zainstalowano, ale nie udało się go bezpiecznie zapisać");
                        return;
                    }
                    authKey = pendingInstallKey.clone();
                    pendingInstallKey = null;
                    adoptConsent = false;
                    Log.i(TAG, "Key installed and stored securely. Retrying auth handshake...");
                    authState = AuthState.NONCE_SENT;
                    for (byte[] command : noopProtocol.keyInstallAcknowledged()) {
                        writeCommand(command);
                    }
                } else if (keyStatus != 0x00) {
                    Log.w(TAG, "SetAuthKey rejected (status=0x" + String.format("%02x", keyStatus) + ")");
                    stopReconnectForPairing();
                    notifyError("Pierścień nie zaakceptował klucza. Wymagane ponowne sparowanie.");
                }
                return;
            }

            if (op >= 0x41 && noopProtocol != null) {
                for (Streams batch : noopProtocol.ingestNotificationBatches(
                    value, (int) (System.currentTimeMillis() / 1000L)
                )) persistNoopStreams(batch);
            }

        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt gatt,
                                            BluetoothGattCharacteristic characteristic,
                                            byte[] value) {
            if (NOTIFY_CHAR_UUID.equals(characteristic.getUuid())) {
                handleNotification(value);
            }
        }

        @Override
        @SuppressWarnings("deprecation")
        public void onCharacteristicChanged(BluetoothGatt gatt,
                                            BluetoothGattCharacteristic characteristic) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                if (NOTIFY_CHAR_UUID.equals(characteristic.getUuid())) {
                    byte[] value = characteristic.getValue();
                    if (value != null) handleNotification(value);
                }
            }
        }

    };

    private void enableNotifications(BluetoothGatt gatt) {
        BluetoothGattService service = gatt.getService(SERVICE_UUID);
        if (service == null) {
            stopReconnectForPairing();
            notifyError("Oura primary service missing");
            return;
        }
        BluetoothGattCharacteristic notifyChar = service.getCharacteristic(NOTIFY_CHAR_UUID);
        BluetoothGattCharacteristic writeChar = service.getCharacteristic(WRITE_CHAR_UUID);
        if (notifyChar == null || writeChar == null) {
            stopReconnectForPairing();
            notifyError("Oura communication characteristics missing");
            return;
        }

        gatt.setCharacteristicNotification(notifyChar, true);
        BluetoothGattDescriptor descriptor = notifyChar.getDescriptor(CCCD_UUID);
        if (descriptor == null) {
            stopReconnectForPairing();
            notifyError("Oura notification descriptor missing");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            gatt.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
        } else {
            descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
            gatt.writeDescriptor(descriptor);
        }
    }

    private boolean writeCommand(byte[] commandBytes) {
        if (commandBytes == null || commandBytes.length == 0) return false;
        return startGattWrite(Arrays.copyOf(commandBytes, commandBytes.length));
    }

    private boolean startGattWrite(byte[] commandBytes) {
        if (bluetoothGatt == null) return false;
        BluetoothGattService service = bluetoothGatt.getService(SERVICE_UUID);
        if (service == null) return false;
        BluetoothGattCharacteristic writeChar = service.getCharacteristic(WRITE_CHAR_UUID);
        if (writeChar == null) return false;

        boolean accepted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            accepted = bluetoothGatt.writeCharacteristic(
                writeChar,
                commandBytes,
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            ) == BluetoothGatt.GATT_SUCCESS;
        } else {
            writeChar.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
            writeChar.setValue(commandBytes);
            accepted = bluetoothGatt.writeCharacteristic(writeChar);
        }
        if (!accepted) {
            Log.w(TAG, "GATT write rejected");
        }
        return accepted;
    }

}
