import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, shiftDateStr } from '../date';
import {
  fetchDeviceSignalsDaily,
  fetchLocationRowsSince,
  fetchOuraNights,
  refreshDeviceSignalsDaily,
} from '../deviceSignalsDailyApi';
import { buildPhoneSignalsInsights, PHONE_SIGNALS_WINDOW_DAYS, type PhoneSignalsInsights } from './buildInsights';

async function loadInsights(userId: string): Promise<PhoneSignalsInsights> {
  const today = getTodayWarsaw();
  const from = shiftDateStr(today, -PHONE_SIGNALS_WINDOW_DAYS);
  try {
    await refreshDeviceSignalsDaily(3);
  } catch (err: unknown) {
    // Stale aggregate is still useful; the nightly cron keeps it fresh.
    console.error('[phone-signals] refresh failed:', err);
  }
  const [daily, oura, locations] = await Promise.all([
    fetchDeviceSignalsDaily(userId, from, today),
    fetchOuraNights(userId, from, today),
    fetchLocationRowsSince(userId, new Date(Date.now() - PHONE_SIGNALS_WINDOW_DAYS * 86_400_000).toISOString()),
  ]);
  return buildPhoneSignalsInsights(daily, oura, locations, today);
}

export function usePhoneSignalsInsights(userId: string) {
  return useQuery({
    queryKey: ['phone-signals-insights', userId],
    queryFn: () => loadInsights(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
