import { Flame, Clock, Calendar, Zap, Plus } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import { getSaunaStats, sessionDateKey } from '../../../lib/health/workoutSauna';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import type { DesktopSessionRow, StravaActivityRow } from '../shell/useDesktopData';

interface Props {
  sessions: DesktopSessionRow[];
  strava?: StravaActivityRow[];
  onOpenSauna?: () => void;
}

export default function DesktopSaunaSection({ sessions, strava, onOpenSauna }: Props) {
  const sevenDaysAgo = shiftDateStr(getTodayWarsaw(), -7);
  const thirtyDaysAgo = shiftDateStr(getTodayWarsaw(), -30);

  const validSessions = sessions.filter((s): s is DesktopSessionRow & { date: string } => typeof s.date === 'string');
  const weekStats = getSaunaStats(validSessions, sevenDaysAgo, strava);
  const monthStats = getSaunaStats(validSessions, thirtyDaysAgo, strava);

  // Find latest sauna session
  const latestSauna = validSessions
    .filter((s) => {
      const name = (s.workout_day || '').toLowerCase();
      const logs = s.exercise_logs ?? [];
      return name.includes('sauna') || logs.some((l) => (l.exercise_name || '').toLowerCase().includes('sauna'));
    })
    .sort((a, b) => (sessionDateKey(b.date) || '').localeCompare(sessionDateKey(a.date) || ''))[0];

  const latestMins = latestSauna
    ? (latestSauna.exercise_logs ?? [])
        .filter((l) => (l.exercise_name || '').toLowerCase().includes('sauna'))
        .reduce((sum, l) => sum + (Number(l.reps) || 0), 0)
    : 0;

  const targetSessionsPerWeek = 2;
  const isTargetMet = weekStats.sessionsCount >= targetSessionsPerWeek;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-warning/20 bg-warning/10 p-2 text-warning">
            <Flame size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Sauna & Regeneracja Ciepłem</h3>
            <p className="text-xs text-text-muted">
              Protokoły szoku cieplnego (HSP70), układ krążenia i regeneracja przywspółczulna
            </p>
          </div>
        </div>
        <Pressable
          onClick={onOpenSauna}
          className="flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/20 transition-colors"
        >
          <Plus size={14} />
          <span>Zaloguj saunę</span>
        </Pressable>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnie 7 dni</p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className={`text-2xl font-light ${isTargetMet ? 'text-success' : 'text-text-primary'}`}>
              {weekStats.sessionsCount}×
            </span>
            <span className="text-2xs text-text-muted">/ cel {targetSessionsPerWeek}×</span>
          </div>
          <p className="mt-0.5 text-2xs text-text-muted">{weekStats.totalMinutes} min łącznie</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnie 30 dni</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{monthStats.sessionsCount}×</p>
          <p className="mt-0.5 text-2xs text-text-muted">{monthStats.totalMinutes} min łącznie</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Clock size={11} /> Średnia sesja
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {monthStats.sessionsCount > 0 ? Math.round(monthStats.totalMinutes / monthStats.sessionsCount) : 0} min
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">80–90°C fińska</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Calendar size={11} /> Ostatnia sesja
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {latestSauna ? sessionDateKey(latestSauna.date) : 'Brak w bazie'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {latestMins > 0 ? `${latestMins} min` : latestSauna ? 'sesja zapisana' : 'zaplanuj sesję'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-custom/50 bg-surface-2/40 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-warning shrink-0" />
          <span className="text-text-secondary">
            Zalecany protokół: <strong>2–3 sesje tygodniowo</strong> po 15–20 minut dla optymalnej ekspresji białek HSP70 i wyrzutu GH.
          </span>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-widest ${
          isTargetMet ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}>
          {isTargetMet ? 'Cel zrealizowany' : 'Wymaga domknięcia'}
        </span>
      </div>
    </Card>
  );
}
