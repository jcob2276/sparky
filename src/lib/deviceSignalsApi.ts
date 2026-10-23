import { getWarsawDayBoundaries, type DeviceSignalEventRow } from '@vanguard/domain';
import type { Json, TablesInsert } from './database.types';
import { supabase } from './supabase';

export interface DeviceSignalUpload {
  clientId: string;
  ts: string;
  kind: string;
  payload: Json;
}

/** Idempotent batch insert: (user_id, client_id) is unique, so retries never duplicate. */
export async function insertDeviceSignalEvents(
  userId: string,
  events: DeviceSignalUpload[],
): Promise<{ ok: boolean; error?: string }> {
  if (events.length === 0) return { ok: true };
  const rows: TablesInsert<'device_signal_events'>[] = events.map((e) => ({
    user_id: userId,
    client_id: e.clientId,
    ts: e.ts,
    kind: e.kind,
    payload: e.payload,
  }));
  const { error } = await supabase
    .from('device_signal_events')
    .upsert(rows, { onConflict: 'user_id,client_id', ignoreDuplicates: true });
  if (error) {
    console.error('[device-signals] upload failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** All signal events of one Warsaw day, ascending. */
export async function fetchDeviceSignalsForDay(
  userId: string,
  dateStr: string,
): Promise<DeviceSignalEventRow[]> {
  const { start, end } = getWarsawDayBoundaries(dateStr);
  const { data, error } = await supabase
    .from('device_signal_events')
    .select('ts, kind, payload')
    .eq('user_id', userId)
    .gte('ts', start)
    .lt('ts', end)
    .order('ts', { ascending: true })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}
