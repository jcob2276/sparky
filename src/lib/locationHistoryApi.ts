import { getWarsawDayBoundaries } from '@vanguard/domain';
import { supabase } from './supabase';

export interface LocationHistoryInsert {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  place_name?: string | null;
  is_manual?: boolean;
  created_at?: string;
  speed?: number | null;
  bearing?: number | null;
  altitude?: number | null;
  provider?: string | null;
  kind?: 'point' | 'visit';
  dwell_seconds?: number | null;
}

function toRow(row: LocationHistoryInsert) {
  return {
    user_id: row.user_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy ?? null,
    place_name: row.place_name ?? null,
    is_manual: row.is_manual ?? false,
    created_at: row.created_at ?? new Date().toISOString(),
    speed: row.speed ?? null,
    bearing: row.bearing ?? null,
    altitude: row.altitude ?? null,
    provider: row.provider ?? null,
    kind: row.kind ?? 'point',
    dwell_seconds: row.dwell_seconds ?? null,
  };
}

/** Idempotent batch upload (retries of the same fix are ignored via user_id+created_at+kind). */
export async function upsertLocationPoints(
  rows: LocationHistoryInsert[],
): Promise<{ ok: boolean; error?: string }> {
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase
    .from('location_history')
    .upsert(rows.map(toRow), { onConflict: 'user_id,created_at,kind', ignoreDuplicates: true });
  if (error) {
    console.error('[location] batch upsert failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function insertLocationPoint(
  row: LocationHistoryInsert,
): Promise<{ ok: boolean; error?: string }> {
  return upsertLocationPoints([row]);
}

export async function fetchLatestLocation(userId: string) {
  const { data, error } = await supabase
    .from('location_history')
    .select('latitude, longitude, place_name, created_at, accuracy')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function countLocationsToday(userId: string, dateStr: string): Promise<number> {
  const { start, end } = getWarsawDayBoundaries(dateStr);
  const { count, error } = await supabase
    .from('location_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end);
  if (error) throw error;
  return count ?? 0;
}
