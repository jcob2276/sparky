/**
 * Native Usage Stats → phone_usage_daily sync (Android only).
 */
import { App } from '@capacitor/app';
import {
  buildPhoneUsageDailyPayload,
  getWarsawDateString,
  getWarsawDayBoundaries,
  warsawDayStartUTCMs,
} from '@vanguard/domain';
import { upsertPhoneUsageDaily } from '../phoneUsageApi';
import { notify } from '../notify';
import { supabase } from '../supabase';
import { isNativePlatform } from './platform';
import { UsageStats } from './usageStatsPlugin';

import { biometricsKeys } from '../queryKeys';
import { queryClient } from '../queryClient';

const SYNC_THROTTLE_MS = 2 * 60 * 1000;

let lastSyncAt = 0;
let activeUserId: string | null = null;
let teardown: (() => void) | null = null;

export interface PhoneUsageSyncResult {
  ok: boolean;
  totalMinutes?: number;
  error?: string;
  skipped?: boolean;
}

function getYesterdayDateStr(todayStr: string): string {
  const d = new Date(new Date(`${todayStr}T12:00:00Z`).getTime() - 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' });
}

async function syncPhoneUsageForDate(
  userId: string,
  dateStr: string,
): Promise<PhoneUsageSyncResult> {
  if (!isNativePlatform() || !userId) {
    return { ok: false, error: 'not_native' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { ok: false, error: 'not_authenticated' };
    }

    const access = await UsageStats.hasAccess();
    if (!access.granted) {
      return { ok: false, error: 'usage_access_denied' };
    }

    const beginMs = warsawDayStartUTCMs(dateStr);
    const dayBoundaries = getWarsawDayBoundaries(dateStr);
    const dayEndMs = new Date(dayBoundaries.end).getTime();
    const endMs = Math.min(dayEndMs, Date.now());

    if (endMs <= beginMs) {
      return { ok: false, error: 'invalid_range' };
    }

    const snapshot = await UsageStats.getDailySnapshot({ beginMs, endMs });
    const payload = buildPhoneUsageDailyPayload(session.user.id, dateStr, snapshot);
    const upsert = await upsertPhoneUsageDaily(payload);
    if (!upsert.ok) {
      return { ok: false, error: upsert.error ?? 'upsert_failed' };
    }

    void queryClient.invalidateQueries({ queryKey: biometricsKeys.all });

    return { ok: true, totalMinutes: payload.total_minutes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'sync_failed';
    console.error('[phone-usage] sync for date failed:', dateStr, err);
    return { ok: false, error: message };
  }
}

export async function syncPhoneUsageToday(
  userId: string,
  force = false,
  options?: { silent?: boolean },
): Promise<PhoneUsageSyncResult> {
  if (!isNativePlatform() || !userId) {
    return { ok: false, error: 'not_native' };
  }

  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_THROTTLE_MS) {
    return { ok: false, skipped: true };
  }

  const dateStr = getWarsawDateString();
  const res = await syncPhoneUsageForDate(userId, dateStr);

  if (res.ok) {
    lastSyncAt = now;

    if (!options?.silent) {
      const toastKey = `phone-usage-sync-toast-${dateStr}`;
      if (!localStorage.getItem(toastKey)) {
        notify(`Czas ekranu zapisany (${res.totalMinutes ?? 0} min)`, 'success');
        localStorage.setItem(toastKey, '1');
      }
    }

    // Lock in yesterday's complete 24h once per day so sleep context is accurate
    const yesterdayStr = getYesterdayDateStr(dateStr);
    const yesterdayKey = `phone-usage-finalized-${yesterdayStr}`;
    if (!localStorage.getItem(yesterdayKey)) {
      void syncPhoneUsageForDate(userId, yesterdayStr).then((yRes) => {
        if (yRes.ok) localStorage.setItem(yesterdayKey, '1');
      });
    }
  }

  return res;
}

export function initUsageStatsSync(userId: string): () => void {
  if (!isNativePlatform() || !userId) return () => {};

  if (teardown && activeUserId === userId) return teardown;

  teardown?.();
  activeUserId = userId;
  lastSyncAt = 0;

  const resumeListener = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && activeUserId) {
      void syncPhoneUsageToday(activeUserId, false, { silent: false });
    }
  });

  void syncPhoneUsageToday(userId, true, { silent: false });

  teardown = () => {
    void resumeListener.then((h) => h.remove());
    if (activeUserId === userId) {
      activeUserId = null;
      teardown = null;
    }
  };

  return teardown;
}

export async function hasUsageStatsAccess(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const access = await UsageStats.hasAccess();
    return access.granted;
  } catch {
    return false;
  }
}

export async function openUsageStatsSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  await UsageStats.openAccessSettings();
}
