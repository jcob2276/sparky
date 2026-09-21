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
import { ChevronLeft, Dumbbell, Plus, LayoutGrid, Flame, Upload, Activity } from 'lucide-react';
import { useWorkoutLogger } from './hooks/useWorkoutLogger';
import { type WorkoutLoggerInitial } from '../../lib/health/workoutLogging';
import ExerciseCard from './workout/ExerciseCard';
import VolumeBar from './workout/VolumeBar';
import PlyoBlock from './workout/PlyoBlock';
import PlateCalculatorModal from './workout/PlateCalculatorModal';
import RestTimerBar from './workout/RestTimerBar';
import WorkoutPresetsModal from './workout/WorkoutPresetsModal';
import WorkoutImportModal from './workout/WorkoutImportModal';
import BodyMapModal from './workout/BodyMapModal';
import WorkoutLiveHud from './workout/WorkoutLiveHud';
import { presetToWorkoutExercises, type WorkoutPreset } from './workout/workoutPresets';
import { computeSessionStats, type WorkoutExercise } from './workout/workoutUtils';
import ManualTimePicker from './workout/ManualTimePicker';
import WorkoutLoggerFooter from './workout/WorkoutLoggerFooter';
import { useUserId } from '../../store/useStore';
import { isPlyoSessionComplete } from '../../lib/health/plyoMarathonProgram';
import { useBackHandler } from '../../lib/native/backStack';

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
  useBackHandler(() => {
    void logger.handleBack();
    return true;
  });
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [plateCalcState, setPlateCalcState] = useState<{
    isOpen: boolean;
    initialKg: number;
    onApply?: (kg: number) => void;
  }>({ isOpen: false, initialKg: 60 });

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

  const handleImportWorkouts = (newExs: WorkoutExercise[], importedName?: string) => {
    if (importedName && !logger.workoutName) {
      logger.setWorkoutName(importedName);
    }
    logger.setExercises((prev) => {
      const hasEmptyOnly = prev.length === 1 && !prev[0].name.trim();
      return hasEmptyOnly ? newExs : [...prev, ...newExs];
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBodyMap(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-custom bg-surface text-text-secondary hover:text-text-primary text-3xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            title="Pokaż mapę zmęczenia mięśniowego"
          >
            <Activity size={11} className="text-emerald-500" /> Anatomia
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-custom bg-surface text-text-secondary hover:text-text-primary text-3xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            title="Importuj sesję ze Strong CSV, Hevy lub FitNotes"
          >
            <Upload size={11} className="text-text-muted" /> Importuj
          </button>
          <button
            type="button"
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-3xs font-black uppercase tracking-wider hover:bg-primary/20 transition-colors cursor-pointer"
            title="Wybierz gotowy zestaw treningowy"
          >
            <LayoutGrid size={11} className="text-primary" /> Zestawy
          </button>
        </div>
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
            <button
              type="button"
              onClick={() => setShowPresets(true)}
              className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <LayoutGrid size={11} className="text-primary" /> Zestawy
            </button>
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
          <Pressable
            onClick={logger.addExercise}
            className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-custom bg-surface hover:bg-surface-solid hover:border-primary/45 p-3 text-xs font-black uppercase tracking-widest text-text-secondary ui-interactive cursor-pointer"
          >
            <Plus size={13} /> Dodaj ćwiczenie
          </Pressable>
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const color =
                n <= 4
                  ? 'border-emerald-500/35 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/25'
                  : n <= 6
                    ? 'border-yellow-500/35 dark:border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20 hover:bg-yellow-500/25'
                    : n <= 8
                      ? 'border-orange-500/35 dark:border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 hover:bg-orange-500/25'
                      : 'border-rose-500/35 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/25';
              const active =
                logger.sessionRpe === n
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-sm opacity-100 font-black'
                  : 'opacity-85 hover:opacity-100';
              return (
                <Pressable
                  key={n}
                  onClick={() => logger.setSessionRpe(logger.sessionRpe === n ? null : n)}
                  className={`rounded-lg border py-2 text-xs font-black ui-interactive cursor-pointer transition-all ${color} ${active}`}
                >
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

      <WorkoutPresetsModal isOpen={showPresets} onClose={() => setShowPresets(false)} onApplyPreset={handleApplyPreset} />
      <WorkoutImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImportWorkouts} />
      <BodyMapModal isOpen={showBodyMap} onClose={() => setShowBodyMap(false)} exercises={logger.exercises} />
    </div>
  );
}
