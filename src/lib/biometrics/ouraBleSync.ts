/**
 * @file ouraBleSync.ts
 * @role Oura Ring BLE connection lifecycle + data refresh trigger.
 *
 * Architecture (noop OuraLiveSource parity):
 *   1. BleProbe.connectDevice() → Android OuraBleDriver auth → GetEvents history fetch
 *   2. OuraBleDriver decodes records → OuraStreamStore.insert*() (INSERT OR IGNORE to SQLite)
 *   3. After each flush OuraBleDriver fires onDataFlushed() → BleProbePlugin emits 'ouraDataUpdated'
 *   4. JS receives 'ouraDataUpdated' → invalidates React Query → UI re-reads from biometricsApi
 *
 * THIS FILE does not accumulate, aggregate, or parse raw BLE records.
 * The native path delegates decoding and persistence mapping to vendored NOOP code.
 * JS only manages device preference and connect/disconnect lifecycle.
 *
 * @usedBy App.tsx (setupGlobalBleSync)
 */

import type { QueryClient } from '@tanstack/react-query';

const BLE_MODE_KEY        = 'vanguard_oura_ble_mode_enabled';
const DEVICE_ADDRESS_KEY  = 'vanguard_oura_device_address';
const DEVICE_NAME_KEY     = 'vanguard_oura_device_name';
const DEVICE_MARKER_VERSION_KEY = 'vanguard_oura_device_marker_version';
const DEVICE_MARKER_VERSION = '2';

// ── Device preference ──────────────────────────────────────────────────────

export function getSavedOuraDevice(): { address: string; name: string } | null {
  try {
    const address = localStorage.getItem(DEVICE_ADDRESS_KEY);
    if (!address) return null;
    if (localStorage.getItem(DEVICE_MARKER_VERSION_KEY) !== DEVICE_MARKER_VERSION) {
      clearSavedOuraDevice();
      return null;
    }
    const name = localStorage.getItem(DEVICE_NAME_KEY) || 'Oura Ring';
    return { address, name };
  } catch {
    return null;
  }
}

export function saveOuraDevice(address: string, name?: string): void {
  try {
    localStorage.setItem(DEVICE_ADDRESS_KEY, address);
    localStorage.setItem(DEVICE_NAME_KEY, name || 'Oura Ring');
    localStorage.setItem(DEVICE_MARKER_VERSION_KEY, DEVICE_MARKER_VERSION);
  } catch { /* ignore */ }
}

export function clearSavedOuraDevice(): void {
  try {
    localStorage.removeItem(DEVICE_ADDRESS_KEY);
    localStorage.removeItem(DEVICE_NAME_KEY);
    localStorage.removeItem(DEVICE_MARKER_VERSION_KEY);
  } catch { /* ignore */ }
}

export function isOuraBleModeEnabled(): boolean {
  try {
    return localStorage.getItem(BLE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOuraBleModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BLE_MODE_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}

// ── Global BLE lifecycle ───────────────────────────────────────────────────

/**
 * Initialises the Oura BLE connection.
 * After auth + history fetch the driver fires 'ouraDataUpdated' → queryClient.invalidateQueries().
 * No raw record parsing happens in JS.
 *
 * Returns a cleanup function (call on unmount / app background).
 */
export function setupGlobalBleSync(queryClient: QueryClient, _userId: string): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!isOuraBleModeEnabled()) {
    console.log('[OuraBleSync] BLE mode is disabled — using Oura Cloud API sync.');
    return () => {};
  }

  let active = true;
  let releaseListener: (() => void) | undefined;
  let stopScan: (() => void) | undefined;
  import('../native/bleProbePlugin').then(({ BleProbe }) => {
    if (!active) return;
    const saved = getSavedOuraDevice();
    const subscriptions: Array<Promise<{ remove: () => void }>> = [];
    const scan = () => {
      if (!active) return;
      subscriptions.push(BleProbe.addListener('scanFinished', () => { stopScan = undefined; }));
      stopScan = () => { void BleProbe.stopScan().catch(() => {}); };
      void BleProbe.startScan({ durationMs: 10000 }).catch(() => {});
    };

    if (saved?.address) {
      console.log('[OuraBleSync] connecting to saved device', saved.address);
      BleProbe.connectDevice({ address: saved.address }).catch((err: unknown) => {
        if (!active) return;
        console.warn('[OuraBleSync] connect to saved device failed, starting scan:', err);
        scan();
      });
    } else {
      console.log('[OuraBleSync] no saved device — starting scan for Oura Ring...');
      scan();
    }

    // Single lightweight event — fired once per flush after SQLite write completes.
    // Mirrors noop SourceCoordinator invalidating the UI after repository.insert().
    subscriptions.push(BleProbe.addListener('ouraDataUpdated', () => {
      if (!active) return;
      console.log('[OuraBleSync] ouraDataUpdated received — invalidating queries');
      queryClient.invalidateQueries();
    }));

    releaseListener = () => {
      subscriptions.forEach((sub) => sub.then((item) => item.remove()).catch(() => {}));
    };
  }).catch(() => {});

  return () => {
    if (!active) return;
    active = false;
    releaseListener?.();
    stopScan?.();
  };
}
