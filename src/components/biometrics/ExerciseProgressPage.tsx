import { useEffect, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { ChevronLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card } from '../ui/Card';
import Spinner from '../ui/Spinner';
import { fetchExerciseHistory } from '../../lib/health/workoutApi';
import {
  buildExerciseProgress,
  formatWeightLabel,
  TREND_LABEL_PL,
} from '../../lib/health/exerciseProgress';
import type { ExerciseProgressSummary, ExerciseSessionSummary } from '../../lib/health/exerciseProgress';
import { useUserId } from '../../store/useStore';

interface ExerciseProgressPageProps {
  exerciseName: string;
  onBack: () => void;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'd/M', { locale: pl });
  } catch {
    return '';
  }
}

function formatSessionDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: pl });
  } catch {
    return dateStr;
  }
}

function E1rmSparkline({ points }: { points: ExerciseProgressSummary['chartPoints'] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-text-muted">
        Wykres pojawi się po 2+ sesjach z ciężarem (masz {points.length}).
      </p>
    );
  }

  const values = points.map((p) => p.e1rm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 280;
  const h = 56;
  const pad = 4;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.e1rm - min) / span) * (h - pad * 2);
    return { x, y, ...p };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 text-primary" aria-hidden>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={line}
        />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r="3" fill="currentColor" />
        ))}
      </svg>
      <div className="flex justify-between text-3xs font-bold text-text-muted px-0.5">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function SessionCard({ session, mode }: { session: ExerciseSessionSummary; mode: ExerciseProgressSummary['mode'] }) {
  return (
    <Card variant="surface" className="border border-border-custom p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-text-primary">{formatSessionDate(session.date)}</p>
          <p className="mt-0.5 text-sm font-bold text-text-secondary">{session.headline}</p>
        </div>
        {mode === 'weighted' && session.e1rm != null && (
          <p className="text-xs font-bold text-text-muted shrink-0">e1RM {session.e1rm.toFixed(1)}</p>
        )}
      </div>
      <div className="grid grid-cols-[var(--ds-arbitrary-28px-1fr-1fr-44px)] gap-1 text-2xs font-bold text-text-muted uppercase tracking-wide">
        <span>#</span>
        <span className="text-center">kg</span>
        <span className="text-center">pow.</span>
        <span className="text-center">RIR</span>
      </div>
      {session.sets.map((set) => (
        <div
          key={set.setNumber}
          className="grid grid-cols-[var(--ds-arbitrary-28px-1fr-1fr-44px)] gap-1 text-xs font-bold text-text-primary"
        >
          <span className="text-text-muted">{set.setNumber}</span>
          <span className="text-center">{formatWeightLabel(set.weight)}</span>
          <span className="text-center">{set.reps}</span>
          <span className="text-center text-text-secondary">{set.rir ?? '—'}</span>
        </div>
      ))}
    </Card>
  );
}

export default function ExerciseProgressPage({ exerciseName, onBack }: ExerciseProgressPageProps) {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExerciseProgressSummary | null>(null);

  useEffect(() => {
    if (!exerciseName.trim() || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchExerciseHistory(exerciseName.trim(), userId);
        const tags = (rows.find((r) => r.muscle_tags?.length)?.muscle_tags ?? []) as string[];
        const built = buildExerciseProgress(exerciseName.trim(), rows, tags);
        if (!cancelled) setSummary(built);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Nie udało się wczytać historii');
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, exerciseName]);

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-2 border-b border-border-custom px-3 py-3">
          <Pressable onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer">
            <ChevronLeft size={20} />
          </Pressable>
          <h1 className="text-sm font-black text-text-primary">{exerciseName}</h1>
        </header>
        <p className="p-6 text-center text-sm text-text-muted">Zaloguj się, aby zobaczyć historię ćwiczenia.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-2 border-b border-border-custom px-3 py-3">
          <Pressable onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer">
            <ChevronLeft size={20} />
          </Pressable>
          <h1 className="text-sm font-black text-text-primary">{exerciseName}</h1>
        </header>
        <p className="p-6 text-center text-sm text-text-muted">{error ?? 'Brak danych dla tego ćwiczenia'}</p>
      </div>
    );
  }

  const sug = summary.suggestion;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border-custom bg-background/95 px-3 py-3 backdrop-blur">
        <Pressable onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer">
          <ChevronLeft size={20} />
        </Pressable>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-text-primary line-clamp-2">{summary.exerciseName}</h1>
          <p className="text-2xs text-text-muted">
            {summary.sessionCount} {summary.sessionCount === 1 ? 'sesja' : summary.sessionCount < 5 ? 'sesje' : 'sesji'} w historii
          </p>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <Card variant="surface" className="border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold text-text-primary leading-relaxed">{summary.insight}</p>
        </Card>

        {sug && (
          <Card variant="surface" className="border border-border-custom p-4">
            <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Sugestia na następny raz</p>
            <p className="mt-1 text-3xl font-black text-primary">{sug.suggestedWeight} kg</p>
            <p className="mt-1 text-xs text-text-secondary">{sug.reason}</p>
            <p className="mt-2 text-2xs text-text-muted">Ostatni top set: {sug.lastWeight} kg</p>
          </Card>
        )}

        {summary.mode === 'weighted' && summary.latestE1rm != null && (
          <Card variant="surface" className="border border-border-custom p-4 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-2xs text-text-muted">e1RM ostatni</p>
                <p className="text-xl font-black text-text-primary">{summary.latestE1rm.toFixed(1)} kg</p>
              </div>
              {summary.bestE1rm != null && summary.bestE1rm !== summary.latestE1rm && (
                <div>
                  <p className="text-2xs text-text-muted">Rekord</p>
                  <p className="text-lg font-black text-text-secondary">{summary.bestE1rm.toFixed(1)} kg</p>
                </div>
              )}
              {summary.e1rmDeltaVsPrev != null && summary.sessionCount >= 3 && (
                <div>
                  <p className="text-2xs text-text-muted">vs poprz. sesja</p>
                  <p className={`text-lg font-black ${summary.e1rmDeltaVsPrev >= 0 ? 'text-success' : 'text-warning'}`}>
                    {summary.e1rmDeltaVsPrev >= 0 ? '+' : ''}{summary.e1rmDeltaVsPrev.toFixed(1)}%
                  </p>
                </div>
              )}
              {summary.trendLabel !== 'insufficient' && (
                <div>
                  <p className="text-2xs text-text-muted">Trend (e1RM)</p>
                  <p className="text-lg font-black text-text-secondary capitalize">
                    {TREND_LABEL_PL[summary.trendLabel]}
                    {summary.trendSlopePct != null ? ` (${summary.trendSlopePct > 0 ? '+' : ''}${summary.trendSlopePct}%/ses.)` : ''}
                  </p>
                </div>
              )}
              {summary.rollingMaxE1rm != null && summary.sessionCount >= 3 && (
                <div>
                  <p className="text-2xs text-text-muted">Max 4 sesje</p>
                  <p className="text-lg font-black text-text-secondary">{summary.rollingMaxE1rm.toFixed(1)} kg</p>
                </div>
              )}
            </div>
            <E1rmSparkline points={summary.chartPoints} />
          </Card>
        )}

        <div className="space-y-2">
          <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Ostatnie sesje</p>
          {summary.sessions.length === 0 ? (
            <p className="text-sm text-text-muted">Brak historii</p>
          ) : (
            summary.sessions.map((s, idx) => (
              <SessionCard key={`${s.date}-${idx}`} session={s} mode={summary.mode} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
