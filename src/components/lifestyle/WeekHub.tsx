import { useState } from 'react';
import Button from '../ui/Button';
import { useUserId } from '../../store/useStore';
import { Target, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
// import ProjectWeekKpis from './ProjectWeekKpis';
import { SystemProposalCard } from '../shared/SystemProposalCard';
import { useDirectionContext } from './direction/hooks/useDirectionContext';
import { useSpineGuidance } from '../../hooks/useSpineGuidance';
import { usePendingProposals } from '../../hooks/usePendingProposals';
import DataStateNotice from '../core/DataStateNotice';
import { getTodayWarsaw, shiftWeekStart, shiftDateStr } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';
import { quickCompleteWeeklyReview, type QuickWeeklyReviewAnswers } from '../../lib/goal/goalSpine';
import { useWeekFacts } from '../../lib/goal/weekFacts';
import { goalSpineKeys } from '../../lib/queryKeys';
import { notify } from '../../lib/notify';
import HealthCoachWeeklyReviewContainer from '../biometrics/workout/HealthCoachWeeklyReview';
import WeekHubQuickReview from './WeekHubQuickReview';
import WeekCoverageCard from './WeekCoverageCard';

export default function WeekHub({
  onOpenActionCenter,
  onStartWeeklyReview,
}: {
  onOpenActionCenter?: () => void;
  onStartWeeklyReview?: () => void;
}) {
  const userId = useUserId() ?? '';
  const weekStart = getWeekStartWarsaw(getTodayWarsaw());
  const today = getTodayWarsaw();
  const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
  const direction = useDirectionContext(userId, weekStart);
  const { guidance } = useSpineGuidance(userId);

  const queryClient = useQueryClient();
  const factsQuery = useWeekFacts(userId, weekStart);
  const [savingReview, setSavingReview] = useState(false);

  const weekReflectionPending = guidance?.steps.some(
    (s: { id: string; status: string }) => s.id === 'week_reflection' && s.status !== 'done',
  );
  // W niedzielę zamykamy bieżący tydzień, w pozostałe dni zaległy poprzedni.
  const closingWeek = isSunday ? weekStart : shiftWeekStart(weekStart, -1);

  const handleQuickReview = async (answers: QuickWeeklyReviewAnswers) => {
    if (!userId) return;
    setSavingReview(true);
    try {
      await quickCompleteWeeklyReview(userId, closingWeek, answers);
      notify('Przegląd tygodnia zapisany', 'success');
      await queryClient.invalidateQueries({ queryKey: goalSpineKeys.weekFacts(userId, weekStart) });
      await direction.reload();
    } catch (err) {
      notify('Nie udało się zapisać przeglądu tygodnia', 'error');
      console.warn('[WeekHub] quickCompleteWeeklyReview error:', err);
    } finally {
      setSavingReview(false);
    }
  };

  const proposalsQuery = usePendingProposals(userId);

  const proposals = proposalsQuery.data ?? [];

  const openMust = direction.openMustPins ?? [];

  return (
    <div className="space-y-5">
      {userId && (
        <HealthCoachWeeklyReviewContainer
          userId={userId}
          weekStart={weekStart}
          weekEnd={shiftDateStr(weekStart, 6)}
        />
      )}
      {factsQuery.data && <WeekCoverageCard facts={factsQuery.data} showReport={isSunday} />}
      {factsQuery.isError && <DataStateNotice title="Nie udało się policzyć pokrycia tygodnia" detail={factsQuery.error.message} tone="warning" />}

      {weekReflectionPending && (
        <WeekHubQuickReview
          weekLabel={closingWeek}
          saving={savingReview}
          onSave={(answers) => { void handleQuickReview(answers); }}
          onStartFullReview={onStartWeeklyReview}
        />
      )}

      {proposalsQuery.error && <DataStateNotice title="Nie udało się odczytać propozycji tygodnia" detail={proposalsQuery.error.message} tone="warning" />}
      {direction.isError && <DataStateNotice title="Nie udało się odczytać kontekstu tygodnia" detail={direction.error?.message} tone="warning" />}
      {!direction.hasData && direction.loading && <DataStateNotice title="Wczytuję kontekst tygodnia" tone="loading" />}
      {proposals.length > 0 && (
        <section className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-warning">
            <AlertCircle size={12} /> Do decyzji ({proposals.length})
          </p>
          {proposals.slice(0, 2).map((p) => (
            <SystemProposalCard
              key={p.id}
              proposal={p}
              onResolved={proposalsQuery.resolve}
            />
          ))}
          {proposals.length > 2 && onOpenActionCenter && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onOpenActionCenter}
              className="text-xs font-semibold text-primary"
            >
              +{proposals.length - 2} więcej w Action Center
            </Button>
          )}
        </section>
      )}

      {openMust.length > 0 && (
        <section className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Target size={12} className="text-primary" /> Must tygodnia ({openMust.length})
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {openMust.map((pin) => (
              <li
                key={pin.id}
                className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.04] p-3 text-xs font-bold text-text-primary shadow-xs"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="truncate">{pin.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ukryte na razie per polecenie Jakuba — do późniejszego przeprojektowania */}
      {/* {direction.weekStart && (direction.activeProjects?.length ?? 0) > 0 && (
        <ProjectWeekKpis
          userId={userId}
          projects={direction.activeProjects!}
          weekStart={direction.weekStart}
          focusProjectIds={direction.sprintFocusProjectIds ?? []}
        />
      )} */}
    </div>
  );
}
