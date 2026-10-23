/**
 * Location → location_history (Android/iOS Capacitor).
 * Continuous collection runs natively (TelemetryForegroundService + Fused provider) into an
 * offline queue; this module uploads that queue and offers a high-accuracy one-shot fallback.
 */
import { App } from '@capacitor/app';
import { Geolocation, type Position } from '@capacitor/geolocation';
import {
  DEFAULT_HOME_RADIUS_M,
  RZESZOW_POI,
  getWarsawDateString,
  resolvePlaceName,
  shouldSampleLocation,
  type LocationPoi,
} from '@vanguard/domain';
import {
  countLocationsToday,
  fetchLatestLocation,
  insertLocationPoint,
} from '../locationHistoryApi';
import { supabase } from '../supabase';
import { isAndroid, isNativePlatform } from './platform';
import { LocationBuffer } from './locationBufferPlugin';
import { getLocationStatus } from './locationPermissions';
import { flushLocationQueue, type LocationFlushResult } from './locationQueueFlush';

const SYNC_THROTTLE_MS = 30 * 60 * 1000;
const MIN_MOVE_M = 200;
/** One-shot fixes worse than this are discarded; manual sync tolerates up to the relaxed limit. */
const MAX_ACCURACY_M = 50;
const MAX_ACCURACY_MANUAL_M = 100;
const POIS_TTL_MS = 10 * 60 * 1000;
const FLUSH_MIN_GAP_MS = 20 * 1000;
const NATIVE_FRESH_MS = 20 * 60 * 1000;

let lastSaved: { lat: number; lng: number; atMs: number } | null = null;
let activeUserId: string | null = null;
let teardown: (() => void) | null = null;
let poisCache: { userId: string; atMs: number; pois: LocationPoi[] } | null = null;
let lastFlushAt = 0;

export interface LocationSyncResult {
  ok: boolean;
  placeName?: string | null;
  error?: string;
  skipped?: boolean;
}

async function loadPois(userId: string): Promise<LocationPoi[]> {
  if (poisCache && poisCache.userId === userId && Date.now() - poisCache.atMs < POIS_TTL_MS) {
    return poisCache.pois;
  }
  const pois: LocationPoi[] = [RZESZOW_POI];
  const { data } = await supabase
    .from('user_settings')
    .select('home_lat, home_lng')
    .eq('user_id', userId)
    .maybeSingle();
  if (data?.home_lat != null && data?.home_lng != null) {
    pois.unshift({
      name: 'Dom',
      lat: Number(data.home_lat),
      lng: Number(data.home_lng),
      radiusM: DEFAULT_HOME_RADIUS_M,
    });
  }
  poisCache = { userId, atMs: Date.now(), pois };
  return pois;
}

export async function hasLocationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const perm = await Geolocation.checkPermissions();
    return perm.location === 'granted';
  } catch {
    return false;
  }
}

async function requestLocationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    let perm = await Geolocation.checkPermissions();
    if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale') {
      perm = await Geolocation.requestPermissions();
    }
    return perm.location === 'granted';
  } catch {
    return false;
  }
}

async function persistPosition(
  userId: string,
  position: Position,
  force: boolean,
): Promise<LocationSyncResult> {
  const now = Date.now();
  const { latitude, longitude, speed, heading, altitude } = position.coords;
  const accuracy = position.coords.accuracy ?? null;

  if (accuracy === null || accuracy > (force ? MAX_ACCURACY_MANUAL_M : MAX_ACCURACY_M)) {
    return force ? { ok: false, error: 'low_accuracy' } : { ok: false, skipped: true };
  }

  if (
    !force &&
    !shouldSampleLocation(latitude, longitude, lastSaved, now, SYNC_THROTTLE_MS, MIN_MOVE_M)
  ) {
    return { ok: false, skipped: true };
  }

  const pois = await loadPois(userId);
  const placeName = resolvePlaceName(latitude, longitude, pois);
  const insert = await insertLocationPoint({
    user_id: userId,
    latitude,
    longitude,
    accuracy,
    speed: speed ?? null,
    bearing: heading ?? null,
    altitude: altitude ?? null,
    provider: 'webview',
    kind: 'point',
    place_name: placeName,
    is_manual: force,
    created_at: new Date(position.timestamp || now).toISOString(),
  });

  if (!insert.ok) {
    return { ok: false, error: insert.error ?? 'insert_failed' };
  }

  lastSaved = { lat: latitude, lng: longitude, atMs: now };
  return { ok: true, placeName };
}

/** Upload buffered native fixes (offline queue). Safe to call from any trigger. */
export async function flushLocationNow(userId: string, force = false): Promise<LocationFlushResult> {
  const now = Date.now();
  if (!force && now - lastFlushAt < FLUSH_MIN_GAP_MS) return { uploaded: 0, pending: 0 };
  lastFlushAt = now;
  return flushLocationQueue(userId, () => loadPois(userId));
}

export async function syncLocationNow(userId: string, force = false): Promise<LocationSyncResult> {
  if (!isNativePlatform() || !userId) {
    return { ok: false, error: 'not_native' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { ok: false, error: 'not_authenticated' };
    }

    const granted = await requestLocationPermission();
    if (!granted) {
      return { ok: false, error: 'location_denied' };
    }

    // Drain first: the native collector usually already has fresher, filtered data.
    await flushLocationNow(session.user.id, true);

    if (!force) {
      const native = await getLocationStatus();
      if (native?.collectorRunning && Date.now() - native.lastFixAtMs < NATIVE_FRESH_MS) {
        return { ok: false, skipped: true };
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 25_000,
      maximumAge: 15_000,
    });

    return persistPosition(session.user.id, position, force);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'location_failed';
    console.error('[location] sync failed:', err);
    return { ok: false, error: message };
  }
}

async function hydrateLastSaved(userId: string): Promise<void> {
  try {
    const latest = await fetchLatestLocation(userId);
    if (!latest?.created_at) return;
    lastSaved = {
      lat: latest.latitude,
      lng: latest.longitude,
      atMs: new Date(latest.created_at).getTime(),
    };
  } catch {
    /* optional cache warm */
  }
}

export function initLocationSync(userId: string): () => void {
  if (!isNativePlatform() || !userId) return () => {};

  if (teardown && activeUserId === userId) return teardown;

  teardown?.();
  activeUserId = userId;
  void hydrateLastSaved(userId);

  const resumeListener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && activeUserId) {
      void flushLocationNow(activeUserId);
      void syncLocationNow(activeUserId, false);
    }
  });

  const onOnline = () => {
    if (activeUserId) void flushLocationNow(activeUserId, true);
  };
  window.addEventListener('online', onOnline);

  const queuedListener = isAndroid()
    ? LocationBuffer.addListener('locationQueued', () => {
        if (activeUserId) void flushLocationNow(activeUserId);
      }).catch(() => null)
    : Promise.resolve(null);

  void flushLocationNow(userId, true);
  void syncLocationNow(userId, true);

  teardown = () => {
    void resumeListener.then((h) => h.remove());
    void queuedListener.then((h) => h?.remove());
    window.removeEventListener('online', onOnline);
    if (activeUserId === userId) {
      activeUserId = null;
      teardown = null;
    }
  };

  return teardown;
}

export async function fetchTodayLocationSummary(userId: string): Promise<{
  count: number;
  latestPlace: string | null;
}> {
  const dateStr = getWarsawDateString();
  const [count, latest] = await Promise.all([
    countLocationsToday(userId, dateStr).catch(() => 0),
    fetchLatestLocation(userId).catch(() => null),
  ]);
  return { count, latestPlace: latest?.place_name ?? null };
}
