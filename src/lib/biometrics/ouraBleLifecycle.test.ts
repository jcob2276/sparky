import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOuraDevice, setOuraBleModeEnabled, setupGlobalBleSync } from './ouraBleSync';

const ble = vi.hoisted(() => ({
  addListener: vi.fn(), connectDevice: vi.fn(), startScan: vi.fn(), stopScan: vi.fn(), remove: vi.fn(),
  callback: (() => {}) as () => void,
  scanFinished: (() => {}) as () => void,
}));
vi.mock('../native/bleProbePlugin', () => ({ BleProbe: ble }));
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); setOuraBleModeEnabled(true);
  ble.connectDevice.mockResolvedValue({ connecting: true });
  ble.startScan.mockResolvedValue({ scanning: true });
  ble.stopScan.mockResolvedValue({ scanning: false });
  ble.addListener.mockImplementation((_event: string, callback: () => void) => {
    if (_event === 'scanFinished') ble.scanFinished = callback;
    else ble.callback = callback;
    return Promise.resolve({ remove: ble.remove });
  });
});
async function flush() { await vi.dynamicImportSettled(); }

describe('global Oura lifecycle', () => {
  it('cancels initialization when disposed before the plugin loads', async () => {
    const stop = setupGlobalBleSync(new QueryClient(), 'alice');
    stop(); await flush();
    expect(ble.addListener).not.toHaveBeenCalled();
    expect(ble.startScan).not.toHaveBeenCalled();
    expect(ble.connectDevice).not.toHaveBeenCalled();
  });

  it('removes the global listener and ignores its late events after cleanup', async () => {
    saveOuraDevice('ring');
    const client = new QueryClient(); const invalidate = vi.spyOn(client, 'invalidateQueries');
    const stop = setupGlobalBleSync(client, 'alice'); await flush();
    expect(ble.addListener).toHaveBeenCalledOnce();
    ble.callback(); expect(invalidate).toHaveBeenCalledOnce();
    stop(); await flush(); ble.callback();
    expect(ble.remove).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('releases a listener handle that resolves after disposal', async () => {
    saveOuraDevice('ring');
    let resolve!: (handle: { remove: () => void }) => void;
    ble.addListener.mockReturnValue(new Promise((done) => { resolve = done; }));
    const stop = setupGlobalBleSync(new QueryClient(), 'alice'); await flush();
    stop(); resolve({ remove: ble.remove }); await flush();
    expect(ble.remove).toHaveBeenCalledOnce();
  });

  it('does not launch fallback scanning after disposal while connect was pending', async () => {
    saveOuraDevice('ring');
    let reject!: (error: Error) => void;
    ble.connectDevice.mockReturnValue(new Promise((_done, fail) => { reject = fail; }));
    const stop = setupGlobalBleSync(new QueryClient(), 'alice'); await flush();
    stop(); reject(new Error('connection cancelled')); await flush();
    expect(ble.startScan).not.toHaveBeenCalled();
  });

  it('stops a scan it launched on cleanup', async () => {
    const stop = setupGlobalBleSync(new QueryClient(), 'alice'); await flush();
    expect(ble.startScan).toHaveBeenCalledOnce();
    stop(); await flush();
    expect(ble.stopScan).toHaveBeenCalledOnce();
  });

  it('does not stop another scan after its own scan has already finished', async () => {
    const stop = setupGlobalBleSync(new QueryClient(), 'alice'); await flush();
    ble.scanFinished(); stop(); await flush();
    expect(ble.stopScan).not.toHaveBeenCalled();
  });
});
