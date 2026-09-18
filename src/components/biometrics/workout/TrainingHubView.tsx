import { useState, useEffect } from 'react';
import { ChevronLeft, TrendingUp, AlertCircle, RotateCcw } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import { getTodayWarsaw } from '../../../lib/date';
import { useHaptics } from '../../../hooks/useHaptics';
import { confirmDialog } from '../../../lib/notify';
import {
  fetchTodayWorkoutDetails,
  fetchRecentWorkoutTemplates,
  type TodayWorkoutDetails,
  type WorkoutTemplateSummary,
} from '../../../lib/health/workoutApi';
import {
  loadWorkoutDraft,
  hasResumableWorkoutDraftContent,
  endWorkoutSession,
  loadWorkoutTemplate,
  type WorkoutLoggerInitial,
} from '../../../lib/health/workoutLogging';
import TrainingTodayCard from './TrainingTodayCard';
import TrainingTemplatesSection from './TrainingTemplatesSection';
import WorkoutNlCaptureModal from './WorkoutNlCaptureModal';

function ActiveDraftBanner({
  onResume,
  onDiscard,
}: {
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-3 animate-in fade-in">
      <div className="flex items-center gap-2 text-warning">
        <AlertCircle size={16} />
        <span className="text-xs font-black uppercase tracking-wider">
          Niezapisany trening w toku
        </span>
      </div>
      <p className="text-xs text-text-secondary">
        Masz rozpoczętą sesję z zapisanymi seriami w pamięci podręcznej.
      </p>
      <div className="flex gap-2 pt-1">
        <Pressable
          onClick={onResume}
          className="flex-1 py-2.5 rounded-xl bg-primary text-on-accent text-xs font-black uppercase tracking-wider shadow-md hover:bg-primary-hover ui-interactive text-center cursor-pointer"
        >
          Wznów sesję
        </Pressable>
        <Pressable
          onClick={onDiscard}
          className="py-2.5 px-3 rounded-xl border border-border-custom bg-surface text-text-muted hover:text-danger text-xs font-bold ui-interactive cursor-pointer"
          title="Odrzuć szkic"
        >
          <RotateCcw size={14} />
        </Pressable>
      </div>
    </div>
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
  const [loading, setLoading] = useState(Boolean(userId));
  const [todaySession, setTodaySession] = useState<TodayWorkoutDetails | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [showNlCapture, setShowNlCapture] = useState(false);
  const haptics = useHaptics();

  const todayStr = getTodayWarsaw();

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    void (async () => {
      try {
        const [todayData, tplData] = await Promise.all([
          fetchTodayWorkoutDetails(userId, todayStr),
          fetchRecentWorkoutTemplates(userId),
        ]);
        if (!isMounted) return;
        setTodaySession(todayData);
        setTemplates(tplData);

        const draft = loadWorkoutDraft(userId);
        setHasDraft(Boolean(draft && hasResumableWorkoutDraftContent(draft)));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId, todayStr]);

  const handleResumeDraft = () => {
    haptics.success();
    onStartWorkout();
  };

  const handleDiscardDraft = async () => {
    if (!userId) return;
    if (await confirmDialog('Czy na pewno chcesz odrzucić niezapisany szkic treningu?')) {
      endWorkoutSession(userId);
      setHasDraft(false);
      haptics.light();
    }
  };

  const handleSelectTemplate = async (tpl: WorkoutTemplateSummary) => {
    if (!userId) return;
    haptics.light();
    setLoading(true);
    try {
      const initial = await loadWorkoutTemplate(userId, tpl.workoutDay);
      onStartWorkout(initial);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBlank = () => {
    haptics.light();
    if (userId) endWorkoutSession(userId);
    onStartWorkout(null);
  };

  return (
    <div className="flex-grow bg-background flex flex-col min-h-screen pb-24 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] bg-background/80 backdrop-blur-[var(--blur-md)] border-b border-border-custom p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pressable
            onClick={onBack}
            className="p-2 -ml-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </Pressable>
          <div>
            <span className="text-3xs font-black uppercase tracking-widest text-text-muted">Siłownia & Ruch</span>
            <h1 className="text-sm font-black uppercase tracking-wider text-text-primary font-display leading-tight">
              Centrum Treningowe
            </h1>
          </div>
        </div>

        <Pressable
          onClick={() => onNavigate('/cwiczenie')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-surface hover:border-primary/40 text-text-secondary hover:text-primary text-xs font-bold ui-interactive cursor-pointer shadow-sm"
        >
          <TrendingUp size={13} />
          <span className="text-2xs font-black uppercase tracking-wider">Baza & PR</span>
        </Pressable>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-5 space-y-6 max-w-md mx-auto w-full">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner size="md" />
            <span className="text-2xs font-black uppercase tracking-widest text-text-muted">
              Wczytywanie jednostek...
            </span>
          </div>
        ) : (
          <>
            {/* Active Draft Banner */}
            {hasDraft && (
              <ActiveDraftBanner
                onResume={handleResumeDraft}
                onDiscard={handleDiscardDraft}
              />
            )}

            {/* Today's Completed Workout */}
            {todaySession && (
              <TrainingTodayCard
                details={todaySession}
                onStartAnother={handleStartBlank}
                onLogSauna={() => onNavigate('/sauna')}
              />
            )}

            {/* Workout Start & Templates */}
            <TrainingTemplatesSection
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
              onStartBlank={handleStartBlank}
              onOpenNlCapture={() => setShowNlCapture(true)}
            />
          </>
        )}
      </main>

      {/* AI NL Capture Modal */}
      {showNlCapture && (
        <WorkoutNlCaptureModal
          isOpen={showNlCapture}
          onClose={() => setShowNlCapture(false)}
          onApplyParsed={(parsed) => {
            onStartWorkout({
              workoutName: parsed.workoutName || 'Trening',
              exercises: parsed.exercises,
              activities: parsed.activities,
              notes: '',
              sessionRpe: null,
            });
          }}
        />
      )}
    </div>
  );
}
