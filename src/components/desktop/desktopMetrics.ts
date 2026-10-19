import { formatWarsawDate } from '../../lib/date';
import { format, startOfWeek } from 'date-fns';
import type { StravaActivitySummary } from './desktopDataTypes';

export function weeklyRunKm(strava: StravaActivitySummary[]) {
  const runs = strava.filter((a) => ['Run', 'TrailRun', 'VirtualRun', 'Hike'].includes(a.sport_type));
  const map: Record<string, number> = {};
  const dates: Record<string, Date> = {};
  for (const a of runs) {
    const ws = startOfWeek(new Date(a.start_date), { weekStartsOn: 1 });
    const k = formatWarsawDate(ws);
    map[k] = (map[k] || 0) + (parseFloat(String(a.distance)) || 0);
    dates[k] = ws;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, v]) => ({ week: format(dates[k], 'dd.MM'), km: Math.round(v / 100) / 10 }));
}
