import { registerPlugin } from '@capacitor/core';
import type { DeviceSignalKind } from '@vanguard/domain';

export type WifiLabel = 'home' | 'work' | 'other';

export interface DeviceSignalsStatus {
  master: boolean;
  enabled: Record<DeviceSignalKind, boolean>;
  activityPermission: boolean;
  stepSensor: boolean;
  lightSensor: boolean;
  notificationAccess: boolean;
  locationPermission: boolean;
  queueSize: number;
  wifiConnected: boolean;
  wifiLabel: WifiLabel | null;
}

export interface NativeDeviceSignal {
  id: number;
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
}

export interface DeviceSignalsPlugin {
  getStatus(): Promise<DeviceSignalsStatus>;
  setMaster(options: { enabled: boolean }): Promise<void>;
  setEnabled(options: { kind: DeviceSignalKind; enabled: boolean }): Promise<void>;
  requestActivityPermission(): Promise<{ granted: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  openAppSettings(): Promise<void>;
  labelCurrentWifi(options: { label: WifiLabel | null }): Promise<void>;
  drain(options: { max: number }): Promise<{ events: NativeDeviceSignal[]; remaining: number }>;
  ack(options: { upToId: number }): Promise<{ remaining: number }>;
  addListener(
    eventName: 'queueReady',
    listenerFunc: () => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const DeviceSignals = registerPlugin<DeviceSignalsPlugin>('DeviceSignals');
