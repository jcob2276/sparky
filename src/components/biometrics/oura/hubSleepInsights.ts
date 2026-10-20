import { buildOuraSleepInsights } from '../../../lib/biometrics/ouraSleepInsights';
import type { OuraHealthHubData } from './types';

/** Wspólne wejście do wskaźników rytmu/długu snu z danych huba (Rytm i Regeneracja). */
export function buildHubSleepInsights(data: OuraHealthHubData) {
  const date = data.date ?? data.oura?.date ?? data.enhanced?.date ?? null;
  const enhanced = date && data.enhanced?.date === date ? data.enhanced : null;
  const enhancedHistory = data.enhancedHistory ?? [];
  const currentInHistory = enhancedHistory.some((day) => day.date === enhanced?.date);
  const insightHistory = currentInHistory || !enhanced ? enhancedHistory : [...enhancedHistory, enhanced];
  const aggregate = (data.ouraHistory ?? []).map((day) => ({
    date: day.date,
    bedtime_start: day.bedtime_timestamp,
    bedtime_end: day.bedtime_end_timestamp,
    total_sleep_hours: day.total_sleep_hours,
    readiness_contributors: null,
    readiness_score: day.readiness_score,
    sleep_score: day.sleep_score,
  }));
  return buildOuraSleepInsights(enhanced, insightHistory, aggregate);
}

export function minutesValue(minutes: number | null): string {
  if (minutes == null) return 'Brak danych';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}
