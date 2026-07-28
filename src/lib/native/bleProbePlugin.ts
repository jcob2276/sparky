import { registerPlugin } from '@capacitor/core';

export interface BleDeviceHit {
  address: string;
  name?: string;
  rssi: number;
  ouraLike: boolean;
}

export interface BleProbeStatus {
  available: boolean;
  adapterOn: boolean;
  permissionGranted: boolean;
  reason?: string;
}

export interface BleScanFinishedEvent {
  hitsCount: number;
  stoppedByTimeout: boolean;
}

export interface BleProbePlugin {
  getStatus(): Promise<BleProbeStatus>;
  requestPermissions(): Promise<{ granted: boolean }>;
  startScan(options?: { timeoutMs?: number; durationMs?: number }): Promise<{ scanning: boolean }>;
  stopScan(): Promise<{ scanning: boolean }>;
  connectDevice(options: { address: string }): Promise<{ connecting: boolean; address: string }>;
  adoptDevice(options: { address: string }): Promise<{ adopting: boolean; address: string }>;
  disconnectDevice(): Promise<void>;
  addListener(
    eventName: 'deviceFound',
    listenerFunc: (device: BleDeviceHit) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'scanFinished',
    listenerFunc: (event: BleScanFinishedEvent) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'connectionStatus',
    listenerFunc: (event: { connected: boolean; address: string }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'ouraLiveHr',
    listenerFunc: (event: { bpm: number; ibiMs: number; address: string }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'ouraBattery',
    listenerFunc: (event: { percent: number; address: string }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'connectionError',
    listenerFunc: (event: { error: string }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'ouraDataUpdated',
    listenerFunc: (event: { source: string; address: string }) => void
  ): Promise<{ remove: () => void }>;
}

export const BleProbe = registerPlugin<BleProbePlugin>('BleProbe');
