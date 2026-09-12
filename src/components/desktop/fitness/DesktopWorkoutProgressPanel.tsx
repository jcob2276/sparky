import { Dumbbell, Plus, ChevronRight, Activity, History, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import type { DesktopSessionRow } from '../shell/useDesktopData';
import { sessionDateKey } from '../../../lib/health/workoutSauna';

interface Props {
  sessions: DesktopSessionRow[];
  onOpenWorkout?: () => void;
}

export default function DesktopWorkoutProgressPanel({ sessions, onOpenWorkout }: Props) {
  // Filter out wellness/sauna only sessions to show real gym workouts
  const strengthSessions = sessions.filter((s) => {
    const name = (s.workout_day || '').toLowerCase();
    return !name.includes('sauna') && !name.includes('wellness');
  });

  const latest = strengthSessions[0] ?? null;

  // Calculate total tonnage for recent 30 days
  const totalTonnageKg = strengthSessions.slice(0, 20).reduce((acc, s) => {
    const exercises = s.exercise_logs ?? [];
    const sessionKg = exercises.reduce((eAcc, ex) => {
      const w = Number(ex.weight) || 0;
      const r = Number(ex.reps) || 0;
      return eAcc + (w * r);
    }, 0);
    return acc + sessionKg;
  }, 0);

  const tonnageMg = Math.round((totalTonnageKg / 1000) * 10) / 10;

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
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Sesje siłowe (30d)</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{strengthSessions.slice(0, 30).length}×</p>
          <p className="mt-0.5 text-2xs text-text-muted">regularny bodziec</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Objętość (Tonaż)</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{tonnageMg > 0 ? `${tonnageMg} Mg` : '—'}</p>
          <p className="mt-0.5 text-2xs text-text-muted">{Math.round(totalTonnageKg).toLocaleString()} kg przerzucone</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Activity size={11} /> Średnie RPE
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {latest?.session_rpe != null ? `@${latest.session_rpe}` : '@8'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">rezerwa 1–2 powtórzeń</p>
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

      {/* Ostatnie sesje lista */}
      {strengthSessions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ostatnie sesje treningowe</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {strengthSessions.slice(0, 3).map((session, idx) => {
              const exCount = (session.exercise_logs ?? []).length;
              return (
                <div key={session.id || idx} className="rounded-xl border border-border-custom/60 bg-surface-2/40 p-2.5 flex items-center justify-between">
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
      )}
    </Card>
  );
}
