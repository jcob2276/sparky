import { useState } from 'react';
import { ChevronLeft, AlertCircle, RotateCcw, Plus, Settings } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import type { WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';
import { useTrainingHub } from './useTrainingHub';
import { useTreningAccent } from './useTreningAccent';
import TrainingTodayCard from './TrainingTodayCard';
import TrainingTemplatesSection from './TrainingTemplatesSection';
import TrainingHubRecords from './TrainingHubRecords';
import TrainingHubInsight from './TrainingHubInsight';
import TrainingHubWeekPanel from './TrainingHubWeekPanel';
import TrainingHubSignals from './TrainingHubSignals';
import TrainingHubAppearanceSheet from './TrainingHubAppearanceSheet';
import TrainingHubPlanSection from './TrainingHubPlanSection';
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
        <span className="text-2xs font-black uppercase tracking-wider">Niezapisany trening</span>
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

function QuickStartCta({ onStart, compact }: { onStart: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <Pressable
        onClick={onStart}
        className="w-full trening-hero-cta py-3 flex items-center justify-center gap-2 text-sm ui-interactive cursor-pointer"
      >
        <Plus size={15} strokeWidth={2.5} />
        Start Workout
      </Pressable>
    );
  }

  return (
    <section className="trening-panel rounded-[var(--tren-radius-card)] p-4 space-y-3 border-primary/25">
      <div className="space-y-1">
        <p className="text-3xs font-black uppercase tracking-widest text-primary">Poczekalnia</p>
        <h2 className="text-[1.25rem] font-black text-text-primary font-display leading-tight tracking-tight">
          Gotowy na sesję?
        </h2>
        <p className="text-xs text-text-secondary leading-snug">
          Mapa zmęczenia i PR poniżej — start pusty albo 1-tap schemat.
        </p>
      </div>
      <Pressable
        onClick={onStart}
        className="w-full trening-hero-cta py-3.5 flex items-center justify-center gap-2 text-sm ui-interactive cursor-pointer"
      >
        <Plus size={16} strokeWidth={2.5} />
        Start Workout
      </Pressable>
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
    insight,
    insightLoading,
    hasDraft,
    fatigueByTag,
    weekStats,
    handleResumeDraft,
    handleDiscardDraft,
    handleSelectTemplate,
    handleStartBlank,
    handleRefreshInsight,
  } = useTrainingHub(userId, onStartWorkout);
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
            <p className="text-3xs font-black uppercase tracking-[0.16em] text-primary">Trening</p>
            <h1 className="text-lg font-black tracking-tight text-text-primary font-display leading-none mt-0.5 truncate">
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
            <span className="text-2xs font-black uppercase tracking-widest text-text-muted">Wczytywanie…</span>
          </div>
        ) : (
          <div className="space-y-3.5 animate-in fade-in">
            {hasDraft && (
              <ActiveDraftBanner onResume={handleResumeDraft} onDiscard={handleDiscardDraft} />
            )}

            {todaySession ? (
              <TrainingTodayCard
                details={todaySession}
                onStartAnother={handleStartBlank}
                onLogSauna={() => onNavigate('/sauna')}
              />
            ) : (
              !hasDraft && <QuickStartCta onStart={handleStartBlank} />
            )}

            <TrainingHubWeekPanel fatigueByTag={fatigueByTag} week={weekStats} />

            <TrainingHubRecords records={records} />

            <TrainingHubSignals forecasts={forecasts} neglects={neglects} />

            <TrainingHubInsight
              insight={insight}
              loading={insightLoading}
              onRefresh={handleRefreshInsight}
            />

            {(todaySession || hasDraft) && (
              <QuickStartCta onStart={handleStartBlank} compact />
            )}

            <TrainingTemplatesSection
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
            />

            {userId && <TrainingHubPlanSection userId={userId} onStartWorkout={onStartWorkout} />}
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
