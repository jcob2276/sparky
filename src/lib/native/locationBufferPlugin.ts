import { registerPlugin } from '@capacitor/core';

/** One buffered fix/visit from the native Fused collector (offline queue row). */
export interface BufferedLocationPoint {
  id: number;
  /** Fix time, epoch ms (UTC). For visits: arrival time. */
  ts: number;
  kind: 'point' | 'visit';
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  altitude?: number;
  provider?: string;
  dwellSeconds?: number;
}

export interface NativeLocationStatus {
  fine: boolean;
  coarse: boolean;
  /** Always true below Android 10 (no separate permission). */
  background: boolean;
  notifications: boolean;
  gpsEnabled: boolean;
  collectorRunning: boolean;
  mode: 'MOVING' | 'STATIONARY' | string;
  pending: number;
  lastFixAtMs: number;
  /** Meters, -1 when unknown. */
  lastFixAccuracy: number;
  accepted: number;
  rejected: number;
  lastReject: string;
}

export interface LocationBufferPlugin {
  drain(options: { limit?: number }): Promise<{ points: BufferedLocationPoint[]; pending: number }>;
  ack(options: { ids: number[] }): Promise<{ pending: number }>;
  status(): Promise<NativeLocationStatus>;
  requestForeground(): Promise<NativeLocationStatus>;
  requestBackground(): Promise<NativeLocationStatus>;
  openLocationSettings(): Promise<void>;
  addListener(
    eventName: 'locationQueued',
    listenerFunc: (event: { pending: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const LocationBuffer = registerPlugin<LocationBufferPlugin>('LocationBuffer');
