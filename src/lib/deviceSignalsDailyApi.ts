import type {
  DeviceSignalsDailyRow,
  LocationRowLike,
  OuraNightRow,
} from '@vanguard/domain';
import type { Json, Tables } from './database.types';
import { supabase } from './supabase';

const PAGE = 1000;
const MAX_PAGES = 6;

function toNumberMap(value: Json): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
  }
  return out;
}

function toConfidence(value: string | null): DeviceSignalsDailyRow['phoneSleepConfidence'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

function mapDaily(row: Tables<'device_signals_daily'>): DeviceSignalsDailyRow {
  return {
    date: row.date,
    eventCount: row.event_count,
    steps: row.steps,
    screenOnMin: row.screen_on_min,
    phoneSleepStart: row.phone_sleep_start,
    phoneSleepEnd: row.phone_sleep_end,
    phoneSleepMin: row.phone_sleep_min,
    phoneSleepSteps: row.phone_sleep_steps,
    phoneSleepCharging: row.phone_sleep_charging,
    phoneSleepConfidence: toConfidence(row.phone_sleep_confidence),
    screenAfter22Min: row.screen_after_22_min,
    eveningLuxAvg: row.evening_lux_avg,
    eveningBrightnessAvg: row.evening_brightness_avg,
    eveningLightSamples: row.evening_light_samples,
    notifTotal: row.notif_total,
    notifPerHour: row.notif_per_hour,
    notifAwakeHours: row.notif_awake_hours,
    notifTop: toNumberMap(row.notif_top),
    homeWifiMin: row.home_wifi_min,
    workWifiMin: row.work_wifi_min,
    otherWifiMin: row.other_wifi_min,
    cellularMin: row.cellular_min,
    offlineMin: row.offline_min,
  };
}

/** Recomputes the last `days` Warsaw days of the caller's aggregate (cron does the same nightly). */
export async function refreshDeviceSignalsDaily(days = 2): Promise<void> {
  const { error } = await supabase.rpc('refresh_device_signals_daily', { p_days: days });
  if (error) throw error;
}

export async function fetchDeviceSignalsDaily(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<DeviceSignalsDailyRow[]> {
  const { data, error } = await supabase
    .from('device_signals_daily')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDaily);
}

/** Oura nights (date = morning the night ended) used to compare/correlate with the phone. */
export async function fetchOuraNights(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<OuraNightRow[]> {
  const { data, error } = await supabase
    .from('oura_enhanced')
    .select('date, bedtime_start, bedtime_end, total_sleep_hours, sleep_score')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.date,
    bedtimeStart: r.bedtime_start,
    bedtimeEnd: r.bedtime_end,
    totalSleepHours: r.total_sleep_hours,
    sleepScore: r.sleep_score,
  }));
}

/** GPS points and visits since `sinceIso` (paged: PostgREST caps a response at 1000 rows). */
export async function fetchLocationRowsSince(userId: string, sinceIso: string): Promise<LocationRowLike[]> {
  const rows: LocationRowLike[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from('location_history')
      .select('created_at, latitude, longitude, kind, dwell_seconds')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const r of batch) {
      if (r.created_at) rows.push({ ...r, created_at: r.created_at });
    }
    if (batch.length < PAGE) break;
  }
  return rows;
}
