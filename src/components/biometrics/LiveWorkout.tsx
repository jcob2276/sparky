/**
 * @component LiveWorkout
 * @role Logger treningu od zera: jedno ćwiczenie aktywne naraz, ✓ zatwierdza serię z podpowiedzią z poprzedniego treningu i sam startuje przerwę.
 * @composes live/LiveExerciseCard, live/LiveRestPill, live/LiveFinishSheet, workout/ExercisePickerModal
 * @usedBy TrainingRoute, DesktopDashboard (lazy)
 */
import { useEffect, useState } from 'react';
import { newSet } from './workout/workoutUtils';
import { ChevronLeft, Plus, Settings } from 'lucide-react';
import Button from '../ui/Button';
import { Pressable } from '../ui/ControlPrimitives';
import { useUserId } from '../../store/useStore';
import { useBackHandler } from '../../lib/native/backStack';
import { type WorkoutLoggerInitial } from '../../lib/health/workoutLogging';
import { useWorkoutLogger } from './hooks/useWorkoutLogger';
import ExercisePickerModal from './workout/ExercisePickerModal';
import TrainingHubAppearanceSheet from './workout/TrainingHubAppearanceSheet';
import { useTreningAccent } from './workout/useTreningAccent';
import LiveExerciseCard from './live/LiveExerciseCard';
import LiveUndoBar from './live/LiveUndoBar';
import LiveFinishSheet from './live/LiveFinishSheet';
import { useRestTimer } from './live/useRestTimer';
import { summarize } from './live/liveWorkoutUtils';
import { useLiveExerciseOps } from './live/useLiveExerciseOps';
import { pluralPl } from '../../lib/formatPl';
import './workout/treningTheme.css';

export default function LiveWorkout({
  onBack,
  initial,
  onSaved,
}: {
  onBack: () => void;
  initial?: WorkoutLoggerInitial | null;
  onSaved?: () => void;
}) {
  const userId = useUserId();
  const { accent, setAccent } = useTreningAccent();
  const logger = useWorkoutLogger({ initial, onSaved, onBack });
  const rest = useRestTimer();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [restTarget, setRestTarget] = useState<{ exerciseId: number; setId: number } | null>(null);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      navigator.wakeLock?.request('screen').then((sentinel) => { lock = sentinel; }).catch(() => undefined);
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);

  useBackHandler(() => {
    void logger.handleBack();
    return true;
  });

  const exercises = logger.exercises.filter((e) => e.name.trim());
  const setExercises = logger.setExercises;
  const hasEmptyExercise = exercises.some((e) => !e.sets?.length);

  // Uszkodzony szkic z lokalnej pamięci (ćwiczenie bez serii) naprawiamy zamiast wywalać ekran.
  useEffect(() => {
    if (!hasEmptyExercise) return;
    setExercises((prev) => prev.map((e) => (e.name.trim() && !e.sets?.length ? { ...e, sets: [newSet()] } : e)));
  }, [hasEmptyExercise, setExercises]);
  const firstOpen = exercises.find((e) => e.sets.some((s) => !s.done));
  const currentId = activeId != null && exercises.some((e) => e.id === activeId) ? activeId : (firstOpen ?? exercises[0])?.id ?? null;
  const summary = summarize(logger.exercises);

  const { setSwapId, requestSwap, undo, setUndo, expireUndo, pickExercise, advanceFrom, removeExercise, moveExercise } = useLiveExerciseOps(logger, exercises, setActiveId);

  return (
    <div className="trening-theme flex min-h-screen flex-col" data-tren-accent={accent}>
      <header className="trening-header sticky top-0 z-[var(--z-sticky)] flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" onClick={() => void logger.handleBack()} aria-label="Wróć z treningu" className="!h-11 !w-11 shrink-0 !rounded-full !px-0">
          <ChevronLeft size={22} />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xl font-semibold tabular-nums leading-none text-text-primary">{logger.elapsed ?? '00:00'}</p>
          <p className="mt-0.5 text-2xs font-bold tracking-normal text-text-muted">
            {summary.sets > 0 ? `${summary.sets} ${pluralPl(summary.sets, 'seria', 'serie', 'serii')}` : 'Trening'}
          </p>
        </div>
        <Pressable onClick={() => setAppearanceOpen(true)} aria-label="Wygląd treningu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-primary">
          <Settings size={18} />
        </Pressable>
        <Button variant="primary" onClick={() => setFinishOpen(true)} className="!h-11 shrink-0 !rounded-full !px-5 !text-sm !font-semibold">
          Zakończ
        </Button>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-3 px-3 pb-24 pt-3">
        {exercises.filter((e) => e.sets?.length).map((exercise, idx) => (
          <LiveExerciseCard
            key={exercise.id}
            exercise={exercise}
            userId={userId ?? undefined}
            active={exercise.id === currentId}
            canMoveUp={idx > 0}
            canMoveDown={idx < exercises.length - 1}
            onMoveUp={() => moveExercise(exercise.id, 'up')}
            onMoveDown={() => moveExercise(exercise.id, 'down')}
            onActivate={() => setActiveId(exercise.id)}
            onChange={logger.updateExercise}
            onRemove={() => void removeExercise(exercise.id)}
            onSwap={() => void requestSwap(exercise.id, () => window.setTimeout(() => setPickerOpen(true), 0))}
            onUndoable={(message, run) => setUndo({ message, run })}
            onSetDone={(seconds, setId) => { setRestTarget({ exerciseId: exercise.id, setId }); rest.start(seconds); }}
            rest={rest.active && restTarget?.exerciseId === exercise.id ? { setId: restTarget.setId, remaining: rest.remaining, finished: rest.finished, onAdjust: rest.adjust, onSkip: rest.skip } : undefined}
            onSetUndone={rest.skip}
            onAllDone={() => advanceFrom(exercise.id)}
          />
        ))}

        {exercises.length === 0 && (
          <div className="px-4 pb-2 pt-10 text-center">
            <p className="text-lg font-bold text-text-primary">Zacznij od pierwszego ćwiczenia</p>
            <p className="mt-1 text-sm text-text-muted">Poprzednie ciężary podpowiemy same.</p>
          </div>
        )}

        <Button variant="tonal" onClick={() => setPickerOpen(true)} className="live-workout-add !h-14 w-full !rounded-lg !text-base !font-semibold">
          <Plus size={18} className="mr-1.5" /> Dodaj ćwiczenie
        </Button>
        <Button variant="tonal-danger" onClick={() => void logger.handleBack()} className="min-h-12 w-full">
          Anuluj trening
        </Button>
      </main>

      {undo && (
        <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] mx-auto w-full max-w-md space-y-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {undo && (
            <LiveUndoBar
              message={undo.message}
              onUndo={() => {
                undo.run();
                setUndo(null);
              }}
              onExpire={expireUndo}
            />
          )}
        </div>
      )}

      <ExercisePickerModal isOpen={pickerOpen} onClose={() => { setPickerOpen(false); setSwapId(null); }} onSelect={pickExercise} />
      <LiveFinishSheet open={finishOpen} onOpenChange={setFinishOpen} logger={logger} duration={logger.elapsed} />
      <TrainingHubAppearanceSheet open={appearanceOpen} accent={accent} onSelect={setAccent} onClose={() => setAppearanceOpen(false)} />
    </div>
  );
}
