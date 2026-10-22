import { Flame } from 'lucide-react';
import { Card } from '../../ui/Card';
import { getSaunaStats, sessionDateKey } from '../../../lib/health/workoutSauna';
import { isGarminSaunaActivity } from '../../../lib/health/garminSauna';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import type { DesktopSessionRow, StravaActivityRow } from '../shell/useDesktopData';

interface Props {
  sessions: DesktopSessionRow[];
  strava?: StravaActivityRow[];
  onOpenSauna?: () => void;
}

export default function DesktopSaunaSection({ sessions, strava }: Props) {
  const sevenDaysAgo = shiftDateStr(getTodayWarsaw(), -7);
  const thirtyDaysAgo = shiftDateStr(getTodayWarsaw(), -30);

  const validSessions = sessions.filter((s): s is DesktopSessionRow & { date: string } => typeof s.date === 'string');
  const weekStats = getSaunaStats(validSessions, sevenDaysAgo, strava);
  const monthStats = getSaunaStats(validSessions, thirtyDaysAgo, strava);

  // Find latest sauna from manual workout sessions
  const latestManual = validSessions
    .filter((s) => {
      const name = (s.workout_day || '').toLowerCase();
      const logs = s.exercise_logs ?? [];
      return name.includes('sauna') || logs.some((l) => (l.exercise_name || '').toLowerCase().includes('sauna'));
    })
    .sort((a, b) => (sessionDateKey(b.date) || '').localeCompare(sessionDateKey(a.date) || ''))[0];

  const manualDate = latestManual ? sessionDateKey(latestManual.date) : '';
  const manualMins = latestManual
    ? (latestManual.exercise_logs ?? [])
        .filter((l) => (l.exercise_name || '').toLowerCase().includes('sauna'))
        .reduce((sum, l) => sum + (Number(l.reps) || 0), 0)
    : 0;

  // Find latest sauna from Garmin / Strava
  const garminSaunas = (strava || []).filter(isGarminSaunaActivity);
  const latestGarmin = garminSaunas.sort((a, b) => (sessionDateKey(b.start_date) || '').localeCompare(sessionDateKey(a.start_date) || ''))[0];
  const garminDate = latestGarmin ? sessionDateKey(latestGarmin.start_date) : '';
  const garminMins = latestGarmin
    ? Math.round((latestGarmin.elapsed_time || latestGarmin.moving_time || 0) / 60)
    : 0;

  const isGarminNewer = !!garminDate && (!manualDate || garminDate >= manualDate);
  const latestDateStr = isGarminNewer ? garminDate : manualDate;
  const latestMinutes = isGarminNewer ? (garminMins || 20) : manualMins;

  const targetSessionsPerWeek = 2;
  const isTargetMet = weekStats.sessionsCount >= targetSessionsPerWeek;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-warning/20 bg-warning/10 p-2 text-warning">
            <Flame size={20} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-text-primary">Sauna</h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-widest ${
          isTargetMet ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}>
          {isTargetMet ? 'Cel tygodnia zrobiony' : `Brakuje ${targetSessionsPerWeek - weekStats.sessionsCount} sesji`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">7 dni</p>
          <p className={`mt-1 text-2xl font-light ${isTargetMet ? 'text-success' : 'text-text-primary'}`}>
            {weekStats.sessionsCount}<span className="text-2xs text-text-muted"> / {targetSessionsPerWeek}</span>
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">{weekStats.totalMinutes} min</p>
        </div>
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">30 dni</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{monthStats.sessionsCount}×</p>
          <p className="mt-0.5 text-2xs text-text-muted">{monthStats.totalMinutes} min</p>
        </div>
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnia</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{latestDateStr ? latestDateStr.slice(5) : '—'}</p>
          <p className="mt-0.5 text-2xs text-text-muted">{latestMinutes > 0 ? `${latestMinutes} min` : ''}</p>
        </div>
      </div>
    </Card>
  );
}
