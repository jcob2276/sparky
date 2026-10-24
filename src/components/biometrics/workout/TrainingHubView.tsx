import { useState } from 'react';
import { ChevronLeft, AlertCircle, RotateCcw, Plus, Settings, Flame } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import type { WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';
import { useTrainingHub } from './useTrainingHub';
import { useTreningAccent } from './useTreningAccent';
import TrainingTodayCard from './TrainingTodayCard';
import TrainingTemplatesSection from './TrainingTemplatesSection';
import TrainingHubRecords from './TrainingHubRecords';
import TrainingHubGoal from './TrainingHubGoal';
import { useBenchGoal } from '../../../lib/health/benchGoalApi';
import TrainingHubWeekPanel from './TrainingHubWeekPanel';
import TrainingHubRunning from './TrainingHubRunning';
import TrainingHubSignals from './TrainingHubSignals';
import TrainingHubAppearanceSheet from './TrainingHubAppearanceSheet';
import './treningTheme.css';

function ActiveDraftBanner({
  onResume,
  onDiscard,
}: {
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="trening-panel rounded-[var(--tren-radius-card)] p-3.5 space-y-2.5 border-warning/35 bg-warning/10">
      <div className="flex items-center gap-2 text-warning">
        <AlertCircle size={14} />
        <span className="text-2xs font-semibold tracking-normal">Niezapisany trening</span>
      </div>
      <p className="text-xs text-text-secondary leading-snug">Sesja z seriami w pamięci podręcznej.</p>
      <div className="flex gap-2">
        <Pressable
          onClick={onResume}
          className="flex-1 py-2.5 rounded-[var(--tren-radius-ctl)] trening-hero-cta text-2xs ui-interactive text-center cursor-pointer"
        >
          Wznów
        </Pressable>
        <Pressable
          onClick={onDiscard}
          className="py-2.5 px-3 rounded-[var(--tren-radius-ctl)] border border-border-custom bg-surface text-text-muted hover:text-danger text-xs font-bold ui-interactive cursor-pointer"
          title="Odrzuć szkic"
        >
          <RotateCcw size={13} />
        </Pressable>
      </div>
    </div>
  );
}

function QuickStartCta({ onStart, onSauna, showStart }: { onStart: () => void; onSauna: () => void; showStart: boolean }) {
  return (
    <section className="trening-panel space-y-3 rounded-[var(--tren-radius-card)] border-primary/25 p-4">
      {showStart && (
        <div className="space-y-1">
          <p className="text-2xs font-semibold tracking-normal text-primary">Poczekalnia</p>
          <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-text-primary">Gotowy na sesję?</h2>
        </div>
      )}
      <div className="flex gap-2">
        {showStart && (
          <Pressable onClick={onStart} className="trening-hero-cta ui-interactive flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm">
            <Plus size={16} strokeWidth={2.5} />
            Start Workout
          </Pressable>
        )}
        <Pressable
          onClick={onSauna}
          aria-label="Zaloguj saunę"
          className={`ui-interactive flex h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border-custom bg-surface-1 text-sm font-bold text-text-primary ${showStart ? 'px-5' : 'flex-1'}`}
        >
          <Flame size={16} className="text-warning" />
          Sauna
        </Pressable>
      </div>
    </section>
  );
}

interface TrainingHubViewProps {
  userId: string | undefined;
  onStartWorkout: (initial?: WorkoutLoggerInitial | null) => void;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

export default function TrainingHubView({
  userId,
  onStartWorkout,
  onBack,
  onNavigate,
}: TrainingHubViewProps) {
  const {
    loading,
    todaySession,
    templates,
    records,
    forecasts,
    neglects,
    hasDraft,
    running,
    fatigueByTag,
    weekStats,
    handleResumeDraft,
    handleDiscardDraft,
    handleSelectTemplate,
    handleStartBlank,
  } = useTrainingHub(userId, onStartWorkout);
  const benchGoal = useBenchGoal(userId);
  const { accent, setAccent } = useTreningAccent();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <div
      className="trening-theme flex-grow flex flex-col min-h-screen pb-20 transition-colors"
      data-tren-accent={accent}
    >
      <header className="trening-header sticky top-0 z-[var(--z-sticky)] px-3 py-3 flex items-center justify-between gap-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Pressable
            onClick={onBack}
            className="p-2 -ml-1 rounded-full bg-surface/80 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </Pressable>
          <div className="min-w-0">
            <p className="text-2xs font-semibold tracking-normal text-primary">Trening</p>
            <h1 className="text-lg font-semibold tracking-tight text-text-primary font-display leading-none mt-0.5 truncate">
              Centrum Treningowe
            </h1>
          </div>
        </div>
        <Pressable
          type="button"
          onClick={() => setAppearanceOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-custom bg-surface text-text-secondary hover:text-primary hover:border-primary/40 cursor-pointer"
          aria-label="Wygląd treningu"
          title="Wygląd"
        >
          <Settings size={16} />
        </Pressable>
      </header>

      <div className="trening-glow-line w-full shrink-0" aria-hidden />

      <main className="flex-1 px-3 py-4 space-y-3.5 max-w-md mx-auto w-full relative">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Spinner size="md" />
            <span className="text-2xs font-semibold tracking-normal text-text-muted">Wczytywanie…</span>
          </div>
        ) : (
          <div className="space-y-3.5 animate-in fade-in">
            {hasDraft && (
              <ActiveDraftBanner onResume={handleResumeDraft} onDiscard={handleDiscardDraft} />
            )}

            <QuickStartCta onStart={handleStartBlank} onSauna={() => onNavigate('/sauna')} showStart={!hasDraft} />

            {todaySession && (
              <TrainingTodayCard
                details={todaySession}
                onStartAnother={handleStartBlank}
                onLogSauna={() => onNavigate('/sauna')}
              />
            )}

            <TrainingHubWeekPanel fatigueByTag={fatigueByTag} week={weekStats} />

            <TrainingHubRunning load={running.data} loading={running.isLoading} />

            <TrainingHubGoal goal={benchGoal.data} />

            <TrainingHubRecords records={records} />

            <TrainingHubSignals forecasts={forecasts} neglects={neglects} />
            <TrainingTemplatesSection
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
            />
          </div>
        )}
      </main>

      <TrainingHubAppearanceSheet
        open={appearanceOpen}
        accent={accent}
        onSelect={setAccent}
        onClose={() => setAppearanceOpen(false)}
      />
    </div>
  );
}
