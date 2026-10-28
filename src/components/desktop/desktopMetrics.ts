import { formatWarsawDate, getWeekStartWarsaw } from '../../lib/date';
import type { StravaActivitySummary } from './desktopDataTypes';
import { isRunSport } from '../../lib/runSports';

export function weeklyRunKm(strava: StravaActivitySummary[]) {
  const runs = strava.filter((a) => isRunSport(a.sport_type));
  const map: Record<string, number> = {};
  for (const a of runs) {
    const k = getWeekStartWarsaw(formatWarsawDate(a.start_date));
    map[k] = (map[k] || 0) + (parseFloat(String(a.distance)) || 0);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, v]) => ({ week: `${k.slice(8, 10)}.${k.slice(5, 7)}`, km: Math.round(v / 100) / 10 }));
}
