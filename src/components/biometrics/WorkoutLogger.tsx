/**
 * @component WorkoutLogger
 * @role Logowanie treningu (ćwiczenia, serie, wagi, RIR/RPE) + auto-resume po kill PWA.
 * @composes workout/ExerciseCard (-> ExerciseNameInput, ExerciseStrengthSets/WellnessSets), workout/VolumeBar,
 *           workout/PlyoBlock
 * @folders hooks/ = useWorkoutLogger (ten plik); useWorkoutResume żyje tu, ale konsument to
 *          core/hooks/useDashboardState (auto-resume na poziomie Dashboard, nie tego komponentu)
 * @usedBy Dashboard (lazy)
 */
import { useState } from 'react';
import { Pressable, ControlInput, ControlTextarea } from '../ui/ControlPrimitives';
import { ChevronLeft, Dumbbell, Play, Square, Plus, Timer, Sparkles, LayoutGrid, Flame, RotateCcw } from 'lucide-react';
import { useWorkoutLogger } from './hooks/useWorkoutLogger';
import { type WorkoutLoggerInitial } from '../../lib/health/workoutLogging';
import ExerciseCard from './workout/ExerciseCard';
import VolumeBar from './workout/VolumeBar';
import PlyoBlock from './workout/PlyoBlock';
import PlateCalculatorModal from './workout/PlateCalculatorModal';
import RestTimerBar from './workout/RestTimerBar';
import WorkoutNlCaptureModal from './workout/WorkoutNlCaptureModal';
import WorkoutPresetsModal from './workout/WorkoutPresetsModal';
import WorkoutLiveHud from './workout/WorkoutLiveHud';
import { presetToWorkoutExercises, type WorkoutPreset } from './workout/workoutPresets';
import { computeSessionStats } from './workout/workoutUtils';
import ManualTimePicker from './workout/ManualTimePicker';
import WorkoutLoggerFooter from './workout/WorkoutLoggerFooter';
import { useUserId } from '../../store/useStore';
import { isPlyoSessionComplete } from '../../lib/health/plyoMarathonProgram';
import { useQuery } from '@tanstack/react-query';
import { fetchRecentWorkoutTemplates } from '../../lib/health/workoutApi';

export default function WorkoutLogger({
  onBack,
  initial,
  onSaved,
}: {
  onBack: () => void;
  initial?: WorkoutLoggerInitial | null;
  onSaved?: () => void;
}) {
  const userId = useUserId();
  const logger = useWorkoutLogger({ initial, onSaved, onBack });
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showNlCapture, setShowNlCapture] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [plateCalcState, setPlateCalcState] = useState<{
    isOpen: boolean;
    initialKg: number;
    onApply?: (kg: number) => void;
  }>({ isOpen: false, initialKg: 60 });

  const { data: recentTemplates } = useQuery({
    queryKey: ['recent-workout-templates', userId],
    queryFn: () => (userId ? fetchRecentWorkoutTemplates(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const recentTemplate = recentTemplates?.[0];

  const handleApplyPreset = (preset: WorkoutPreset) => {
    if (!logger.workoutName) {
      logger.setWorkoutName(preset.name);
    }
    const newExs = presetToWorkoutExercises(preset);
    logger.setExercises((prev) => {
      const hasEmptyOnly = prev.length === 1 && !prev[0].name.trim();
      return hasEmptyOnly ? newExs : [...prev, ...newExs];
    });
  };

  const handleRepeatRecent = () => {
    if (!recentTemplate) return;
    if (!logger.workoutName) {
      logger.setWorkoutName(recentTemplate.workoutDay);
    }
    const repeatExercises = recentTemplate.exercises.map((name) => ({
      id: Date.now() + Math.random(),
      name,
      tags: [],
      sets: [
        { id: Date.now() + Math.random(), kg: '', reps: '', rir: '', msp: false },
        { id: Date.now() + Math.random() + 1, kg: '', reps: '', rir: '', msp: false },
        { id: Date.now() + Math.random() + 2, kg: '', reps: '', rir: '', msp: false },
      ],
    }));
    logger.setExercises((prev) => {
      const hasEmptyOnly = prev.length === 1 && !prev[0].name.trim();
      return hasEmptyOnly ? repeatExercises : [...prev, ...repeatExercises];
    });
  };

  const sessionStats = computeSessionStats(logger.exercises);

  return (
    <div className="flex-grow bg-background flex flex-col min-h-screen pb-32 transition-colors duration-[var(--motion-slow)]">
      <header className="sticky top-0 z-[var(--z-sticky)] bg-background/85 backdrop-blur-[var(--blur-md)] border-b border-border-custom px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pressable onClick={logger.handleBack} className="p-1.5 -ml-1.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
            <ChevronLeft size={20} />
          </Pressable>
          <h1 className="text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-primary font-display">Zaloguj Trening</h1>
        </div>
        {recentTemplate && logger.exercises.length <= 1 && !logger.exercises[0]?.name.trim() && (
          <button
            type="button"
            onClick={handleRepeatRecent}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-3xs font-black uppercase tracking-wider hover:bg-primary/20 transition-colors cursor-pointer"
            title="Powtórz ostatni trening"
          >
            <RotateCcw size={10} /> Powtórz
          </button>
        )}
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <WorkoutLiveHud
          stats={sessionStats}
          elapsed={logger.elapsed}
          timerActive={Boolean(logger.timerStart)}
          showRestTimer={showRestTimer}
          onToggleTimer={() => logger.setTimerStart(logger.timerStart ? null : Date.now())}
          onToggleRestTimer={() => setShowRestTimer((prev) => !prev)}
        />
        {/* Plyometrics — opt-in instead of auto-forced */}
        {!logger.plyoSkipped && logger.plyoSession && logger.plyoDone.length > 0 && !isPlyoSessionComplete(logger.plyoDone) ? (
          <PlyoBlock
            session={logger.plyoSession}
            done={logger.plyoDone}
            onToggleSet={logger.togglePlyoSet}
            onSkip={() => {
              logger.setPlyoSkipped(true);
            }}
          />
        ) : (
          <div className="flex justify-end -mb-2">
            <button
              type="button"
              onClick={() => logger.setPlyoSkipped(false)}
              className="inline-flex items-center gap-1.5 text-3xs font-bold text-text-muted hover:text-primary transition-colors cursor-pointer py-1 px-2.5 rounded-full border border-border-custom/40 bg-surface/50 hover:bg-surface-solid"
            >
              <Flame size={11} className="text-warning" /> + Dodaj Pliometrię (Wertykalne)
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-2xs font-black uppercase tracking-widest text-text-secondary">Nazwa sesji</label>
          <ControlInput type="text" value={logger.workoutName} onChange={e => logger.setWorkoutName(e.target.value)}
            placeholder="np. Wertykalne (OHP/Drążek), Horyzontalne (Bench)..."
            className="w-full bg-surface-solid border border-border-custom rounded-2xl px-4 py-3 text-sm font-bold text-text-primary outline-none focus:bg-surface-solid focus:border-primary/50 focus:shadow-focus ui-interactive placeholder:text-text-muted/40" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell size={12} className="text-text-muted" />
              <span className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted">Ćwiczenia</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPresets(true)}
                className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <LayoutGrid size={11} className="text-primary" /> Zestawy
              </button>
              <span className="text-border-custom">|</span>
              <Pressable
                onClick={() => setShowNlCapture(true)}
                className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                <Sparkles size={11} /> AI Zrzut
              </Pressable>
            </div>
          </div>
          {logger.exercises.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onChange={logger.updateExercise}
              onRemove={() => logger.removeExercise(ex.id)}
              userId={userId}
              onOpenPlateCalc={(kg, onApply) => setPlateCalcState({ isOpen: true, initialKg: kg, onApply })}
            />
          ))}
          <div className="flex gap-2">
            <Pressable
              onClick={logger.addExercise}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-custom bg-surface hover:bg-surface-solid hover:border-primary/45 p-3 text-xs font-black uppercase tracking-widest text-text-secondary ui-interactive cursor-pointer"
            >
              <Plus size={13} /> Dodaj ćwiczenie
            </Pressable>
            <Pressable
              onClick={() => setShowPresets(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 rounded-2xl border border-border-custom bg-surface-solid hover:border-primary/45 text-text-primary text-xs font-black uppercase tracking-wider ui-interactive cursor-pointer"
              title="Wybierz gotowy zestaw (Wertykalne / Horyzontalne)"
            >
              <LayoutGrid size={13} className="text-primary" /> Zestawy
            </Pressable>
            <Pressable
              onClick={() => setShowNlCapture(true)}
              className="flex items-center justify-center gap-1.5 px-3 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-wider ui-interactive cursor-pointer"
              title="Zrzut notatki z siłowni przez AI"
            >
              <Sparkles size={13} /> AI
            </Pressable>
          </div>
          <VolumeBar exercises={logger.exercises} />
        </div>

        <div className="space-y-2">
          <label className="text-2xs font-black uppercase tracking-widest text-text-secondary">Notatki</label>
          <ControlTextarea value={logger.notes} onChange={e => logger.setNotes(e.target.value)} placeholder="Jak poszło?..."
            className="w-full bg-surface-solid border border-border-custom rounded-2xl px-4 py-3 text-sm text-text-primary min-h-[var(--ds-h-100px)] outline-none focus:bg-surface-solid focus:border-primary/50 focus:shadow-focus ui-interactive resize-none placeholder:text-text-muted/40" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-black uppercase tracking-widest text-text-secondary">RPE sesji</label>
            {logger.sessionRpe && (
              <Pressable onClick={() => logger.setSessionRpe(null)} className="text-2xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer">wyczyść</Pressable>
            )}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {[1,2,3,4,5,6,7,8,9,10].map(n => {
              const active = logger.sessionRpe === n ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-sm' : 'opacity-[var(--opacity-80)] hover:opacity-[var(--opacity-100)]';
              return (
                <Pressable key={n} onClick={() => logger.setSessionRpe(logger.sessionRpe === n ? null : n)}
                  className={`rounded-lg border border-border-custom bg-surface-solid/50 py-2 text-xs font-black ui-interactive cursor-pointer ${active}`}>
                  {n}
                </Pressable>
              );
            })}
          </div>
          <p className="text-2xs text-text-muted">
            {logger.sessionRpe ? (logger.sessionRpe <= 4 ? 'Łatwa — dużo rezerwy' : logger.sessionRpe <= 6 ? 'Umiarkowana' : logger.sessionRpe <= 8 ? 'Ciężka — mało rezerwy' : 'Maksymalna — do oporu') : 'Jak ciężka była cała sesja?'}
          </p>
        </div>

        <ManualTimePicker logger={logger} />
      </main>

      <WorkoutLoggerFooter exercises={logger.exercises} saving={logger.saving} onSave={logger.save} />

      {showRestTimer && <RestTimerBar onDismiss={() => setShowRestTimer(false)} />}

      {plateCalcState.isOpen && (
        <PlateCalculatorModal
          isOpen={plateCalcState.isOpen}
          initialWeight={plateCalcState.initialKg}
          onClose={() => setPlateCalcState((prev) => ({ ...prev, isOpen: false }))}
          onApplyWeight={plateCalcState.onApply}
        />
      )}

      {showNlCapture && (
        <WorkoutNlCaptureModal
          isOpen={showNlCapture}
          onClose={() => setShowNlCapture(false)}
          onApplyParsed={(parsed) => {
            if (parsed.workoutName && !logger.workoutName) logger.setWorkoutName(parsed.workoutName);
            logger.setExercises((prev) => [...prev.filter((e) => e.name.trim()), ...parsed.exercises]);
            if (parsed.activities.length) logger.setActivities((prev) => [...prev, ...parsed.activities]);
          }}
        />
      )}

      <WorkoutPresetsModal isOpen={showPresets} onClose={() => setShowPresets(false)} onApplyPreset={handleApplyPreset} />
    </div>
  );
}
