/**
 * Native phone signals → device_signal_events (Android only).
 * Collectors run natively and queue events offline; this module only drains the queue in
 * batches and acks after a successful upload, so a failed upload loses nothing.
 */
import { App } from '@capacitor/app';
import type { Json } from '../database.types';
import { insertDeviceSignalEvents, type DeviceSignalUpload } from '../deviceSignalsApi';
import { supabase } from '../supabase';
import { BackgroundSync } from './backgroundSyncPlugin';
import { DeviceSignals, type NativeDeviceSignal } from './deviceSignalsPlugin';
import { isNativePlatform } from './platform';

const BATCH_SIZE = 400;
const MAX_BATCHES_PER_FLUSH = 5;
const FLUSH_MIN_GAP_MS = 20_000;

let flushing = false;
let lastFlushAt = 0;
let activeUserId: string | null = null;
let teardown: (() => void) | null = null;

export interface DeviceSignalsFlushResult {
  ok: boolean;
  uploaded: number;
  error?: string;
  skipped?: boolean;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function toUpload(e: NativeDeviceSignal): DeviceSignalUpload {
  const ts = new Date(e.ts).toISOString();
  return { clientId: `${e.ts}-${e.kind}-${e.id}`, ts, kind: e.kind, payload: toJson(e.payload) };
}

export async function flushDeviceSignals(userId: string, force = false): Promise<DeviceSignalsFlushResult> {
  if (!isNativePlatform() || !userId) return { ok: false, uploaded: 0, error: 'not_native' };
  if (flushing) return { ok: false, uploaded: 0, skipped: true };
  const now = Date.now();
  if (!force && now - lastFlushAt < FLUSH_MIN_GAP_MS) return { ok: false, uploaded: 0, skipped: true };

  flushing = true;
  let uploaded = 0;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return { ok: false, uploaded, error: 'not_authenticated' };

    for (let i = 0; i < MAX_BATCHES_PER_FLUSH; i += 1) {
      const { events, remaining } = await DeviceSignals.drain({ max: BATCH_SIZE });
      if (events.length === 0) break;
      const res = await insertDeviceSignalEvents(session.user.id, events.map(toUpload));
      if (!res.ok) return { ok: false, uploaded, error: res.error ?? 'upload_failed' };
      await DeviceSignals.ack({ upToId: events[events.length - 1].id });
      uploaded += events.length;
      if (remaining <= events.length) break;
    }
    lastFlushAt = Date.now();
    return { ok: true, uploaded };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'flush_failed';
    console.error('[device-signals] flush failed:', err);
    return { ok: false, uploaded, error: message };
  } finally {
    flushing = false;
  }
}

export function initDeviceSignalsSync(userId: string): () => void {
  if (!isNativePlatform() || !userId) return () => {};
  if (teardown && activeUserId === userId) return teardown;

  teardown?.();
  activeUserId = userId;

  const flush = () => {
    if (activeUserId) void flushDeviceSignals(activeUserId);
  };
  const queueListener = DeviceSignals.addListener('queueReady', flush);
  const tickListener = BackgroundSync.addListener('syncTick', flush);
  const resumeListener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) flush();
  });
  void flushDeviceSignals(userId, true);

  teardown = () => {
    void queueListener.then((h) => h.remove());
    void tickListener.then((h) => h.remove());
    void resumeListener.then((h) => h.remove());
    if (activeUserId === userId) {
      activeUserId = null;
      teardown = null;
    }
  };
  return teardown;
}
