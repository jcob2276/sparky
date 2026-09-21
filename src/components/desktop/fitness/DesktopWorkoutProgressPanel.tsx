import { useState, useMemo } from 'react';
import { Dumbbell, Plus, ChevronRight, Activity, History, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import type { DesktopSessionRow, StravaActivityRow } from '../shell/useDesktopData';
import { sessionDateKey } from '../../../lib/health/workoutSauna';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import WorkoutActivityHeatmap from '../../biometrics/workout/WorkoutActivityHeatmap';

interface Props {
  sessions: DesktopSessionRow[];
  strava?: StravaActivityRow[];
  onOpenWorkout?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export default function DesktopWorkoutProgressPanel({ sessions, strava, onOpenWorkout }: Props) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Filter out wellness/sauna only sessions to show real gym workouts
  const strengthSessions = sessions.filter((s) => {
    const name = (s.workout_day || '').toLowerCase();
    return !name.includes('sauna') && !name.includes('wellness');
  });

  const sortedStrength = [...strengthSessions].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  const latest = sortedStrength[0] ?? null;

  const heatmapWorkouts = useMemo(() => {
    return sessions
      .map((s) => {
        const exercises = s.exercise_logs ?? [];
        const tonnage = exercises.reduce((acc, ex) => {
          const w = Number(ex.weight) || 0;
          const r = Number(ex.reps) || 0;
          return acc + (w * r);
        }, 0);
        return {
          date: s.date || '',
          durationMinutes: 45,
          totalTonnage: tonnage,
        };
      })
      .filter((w) => Boolean(w.date));
  }, [sessions]);

  // Calculate total tonnage for recent 30 sessions
  const totalTonnageKg = sortedStrength.slice(0, 30).reduce((acc, s) => {
    const exercises = s.exercise_logs ?? [];
    const sessionKg = exercises.reduce((eAcc, ex) => {
      const w = Number(ex.weight) || 0;
      const r = Number(ex.reps) || 0;
      return eAcc + (w * r);
    }, 0);
    return acc + sessionKg;
  }, 0);

  const tonnageMg = Math.round((totalTonnageKg / 1000) * 10) / 10;

  // Calculate 30-day running volume & heart rate
  const thirtyDaysAgo = shiftDateStr(getTodayWarsaw(), -30);
  const runs30d = (strava || []).filter((a) => {
    const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type || '');
    return isRun && (a.start_date || '') >= thirtyDaysAgo;
  });

  const totalRunKm30d = runs30d.reduce((sum, a) => sum + (Number(a.distance) || 0) / 1000, 0);
  const validHrs = runs30d.map((a) => a.hr_avg).filter((h): h is number => h != null && h > 60);
  const avgRunHr30d = validHrs.length ? Math.round(validHrs.reduce((s, h) => s + h, 0) / validHrs.length) : null;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Dumbbell size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Dziennik Treningowy & Siła</h3>
            <p className="text-xs text-text-muted">
              Objętość tonażu (Mg), periodyzacja, RPE i progresja obciążeń
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Pressable
            type="button"
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showHeatmap
                ? 'border-primary/40 bg-primary/20 text-primary'
                : 'border-border-custom bg-background/50 text-text-secondary hover:text-text-primary hover:bg-surface-2'
            }`}
            title="Przełącz widok 52-tygodniowej matrycy aktywności (GitHub-style)"
          >
            <Activity size={13} />
            <span>{showHeatmap ? 'Ukryj matrycę' : 'Matryca 52 tyg.'}</span>
          </Pressable>
          <Link
            to="/cwiczenie"
            className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <BookOpen size={13} />
            <span>Atlas & Progresja</span>
          </Link>
          <Link
            to="/trening"
            className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <History size={13} />
            <span>Historia</span>
          </Link>
          <Pressable
            onClick={onOpenWorkout}
            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus size={14} />
            <span>Trening</span>
          </Pressable>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Jednostki (30d)</p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {sortedStrength.slice(0, 30).length + runs30d.length}×
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {sortedStrength.slice(0, 30).length}× siła · {runs30d.length}× bieg
          </p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Objętość hybrydowa (30d)</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{tonnageMg > 0 ? `${tonnageMg} Mg` : '—'}</p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {totalRunKm30d > 0
              ? `+ ${totalRunKm30d.toFixed(1)} km bieg ${avgRunHr30d ? `(ø ${avgRunHr30d} bpm)` : ''}`
              : `${Math.round(totalTonnageKg).toLocaleString()} kg przerzucone`}
          </p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Activity size={11} /> Średnie RPE
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {latest?.session_rpe != null ? `@${latest.session_rpe}` : '@8'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {latest?.session_rpe != null
              ? latest.session_rpe >= 9.5
                ? 'upadek mięśniowy (RIR 0)'
                : latest.session_rpe >= 9
                ? 'rezerwa 1 powtórzenie (RIR 1)'
                : latest.session_rpe >= 8
                ? 'rezerwa 2 powtórzenia (RIR 2)'
                : latest.session_rpe >= 7
                ? 'rezerwa ~3 powtórzenia (RIR 3)'
                : 'praca submaksymalna / deload'
              : 'rezerwa 2 powtórzenia'}
          </p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnia sesja</p>
          <p className="mt-1 text-sm font-semibold text-text-primary truncate">
            {latest?.workout_day || 'Brak sesji'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {latest?.date ? sessionDateKey(latest.date) : 'zaplanuj trening'}
          </p>
        </div>
      </div>

      {showHeatmap && (
        <div className="rounded-2xl border border-border-custom bg-background/40 p-3 animate-in fade-in">
          <WorkoutActivityHeatmap workouts={heatmapWorkouts} />
        </div>
      )}

      {totalRunKm30d > 0 && (
        <HybridSummaryBanner
          tonnageMg={tonnageMg}
          totalTonnageKg={totalTonnageKg}
          totalRunKm30d={totalRunKm30d}
          avgRunHr30d={avgRunHr30d}
        />
      )}

      {sortedStrength.length > 0 && (
        <RecentSessionsList sortedStrength={sortedStrength} onOpenWorkout={onOpenWorkout} />
      )}
    </Card>
  );
}

function HybridSummaryBanner({
  tonnageMg,
  totalTonnageKg,
  totalRunKm30d,
  avgRunHr30d,
}: {
  tonnageMg: number;
  totalTonnageKg: number;
  totalRunKm30d: number;
  avgRunHr30d: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-custom/50 bg-surface-2/40 px-3.5 py-2 text-2xs text-text-secondary">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-primary">Tonaż siłowy:</span>
        <span className="font-mono font-semibold">{tonnageMg} Mg</span>
        <span className="text-text-muted">({Math.round(totalTonnageKg).toLocaleString()} kg)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-warning">Dystans biegowy:</span>
        <span className="font-mono font-semibold">{totalRunKm30d.toFixed(1)} km</span>
        {avgRunHr30d && (
          <span className="text-text-muted">· śr. tętno <strong>{avgRunHr30d} bpm</strong></span>
        )}
      </div>
      <div className="text-text-muted">
        Profil: <span className="font-bold text-text-primary">Hybrydowy (Siła + Bieganie)</span>
      </div>
    </div>
  );
}

function RecentSessionsList({
  sortedStrength,
  onOpenWorkout,
}: {
  sortedStrength: DesktopSessionRow[];
  onOpenWorkout?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnie sesje treningowe</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sortedStrength.slice(0, 3).map((session, idx) => {
          const exCount = (session.exercise_logs ?? []).length;
          return (
            <div
              key={session.id || idx}
              onClick={onOpenWorkout}
              className="rounded-xl border border-border-custom/60 bg-surface-2/40 p-2.5 flex items-center justify-between cursor-pointer hover:border-primary/40 hover:bg-surface-2/70 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-primary truncate">{session.workout_day || 'Trening'}</p>
                <p className="text-3xs text-text-muted">
                  {sessionDateKey(session.date)} · {exCount} ćwiczeń
                  {session.session_rpe ? ` · RPE ${session.session_rpe}` : ''}
                </p>
              </div>
              <ChevronRight size={14} className="text-text-muted shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
