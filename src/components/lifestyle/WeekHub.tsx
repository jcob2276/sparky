import { useState } from 'react';
import Button from '../ui/Button';
import { useQuery } from '@tanstack/react-query';
import { useUserId } from '../../store/useStore';
import { CalendarDays, Target, AlertCircle, ChevronRight, Check, History } from 'lucide-react';
import WeekLoopSummary from '../shared/WeekLoopSummary';
// import ProjectWeekKpis from './ProjectWeekKpis';
import WeeklyBalanceHexagon from './WeeklyBalanceHexagon';
import { SystemProposalCard } from '../shared/SystemProposalCard';
import { useDirectionContext } from './direction/hooks/useDirectionContext';
import { useSpineGuidance } from '../../hooks/useSpineGuidance';
import {
  fetchPendingProposals,
  resolveProposal,
  syncFrictionProposals,
} from '../../lib/systemProposals';
import { getTodayWarsaw, shiftWeekStart } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';
import { quickCompleteOverdueWeeklyReview } from '../../lib/goal/goalSpine';
import { notify } from '../../lib/notify';

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

  const [closingOverdue, setClosingOverdue] = useState(false);

  const weekReflectionPending = guidance?.steps.some(
    (s: { id: string; status: string }) => s.id === 'week_reflection' && s.status !== 'done',
  );
  const showReviewCta = Boolean(weekReflectionPending && onStartWeeklyReview);
  const sundayReviewCta = showReviewCta && isSunday;
  const overdueReviewCue = showReviewCta && !isSunday;

  const handleQuickComplete = async () => {
    if (!userId) return;
    setClosingOverdue(true);
    try {
      const prevWeek = shiftWeekStart(weekStart, -1);
      await quickCompleteOverdueWeeklyReview(userId, prevWeek, 'Zamknięty (szybkie odblokowanie)');
      notify('Poprzedni tydzień został domknięty', 'success');
      await direction.reload();
    } catch (err) {
      notify('Nie udało się zamknąć poprzedniego tygodnia', 'error');
      console.warn('[WeekHub] quickCompleteOverdueWeeklyReview error:', err);
    } finally {
      setClosingOverdue(false);
    }
  };

  const proposalsQuery = useQuery({
    queryKey: ['system-proposals', userId],
    queryFn: async () => {
      await syncFrictionProposals(userId);
      return fetchPendingProposals(userId);
    },
    enabled: !!userId,
  });

  const proposals = proposalsQuery.data ?? [];

  const openMust = direction.openMustPins ?? [];

  return (
    <div className="space-y-5">
      {sundayReviewCta && (
        <Button
          variant="tonal"
          size="md"
          type="button"
          onClick={onStartWeeklyReview}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-left transition-colors hover:bg-primary/15 active:scale-[var(--ds-arbitrary-0-99)]"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-primary">
              <CalendarDays size={12} /> Zamknięcie tygodnia
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary leading-snug">
              Niedziela — refleksja + plan następnego tygodnia
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-primary" />
        </Button>
      )}

      {overdueReviewCue && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] p-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-warning">
              <History size={12} /> Poprzedni tydzień czeka na domknięcie
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Zamknij zaległość jednym kliknięciem, aby zachować czysty rytm tygodnia.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleQuickComplete}
              disabled={closingOverdue}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-warning border-warning/30 hover:bg-warning/10"
            >
              <Check size={12} className="mr-1 inline" /> Zamknij tydzień
            </Button>
            {onStartWeeklyReview && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onStartWeeklyReview}
                className="text-xs font-semibold text-text-muted hover:text-warning px-1.5 py-1 transition-colors"
              >
                Pełny review →
              </Button>
            )}
          </div>
        </div>
      )}

      {proposals.length > 0 && (
        <section className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-14em)] text-warning">
            <AlertCircle size={12} /> Do decyzji ({proposals.length})
          </p>
          {proposals.slice(0, 2).map((p) => (
            <SystemProposalCard
              key={p.id}
              proposal={p}
              onResolved={async (id, status) => {
                await resolveProposal(id, status);
                void proposalsQuery.refetch();
              }}
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

      {direction.weekStart && (
        <WeekLoopSummary
          ctx={{
            weekGoals: direction.weekGoals ?? { intention: null, commitment: null, cialo: null, duch: null, konto: null },
            weekGoalsMeta: direction.weekGoalsMeta,
            focus: direction.focus ?? { skillId: null, skillLabel: null, subskillLabel: null, targetLevel: null },
            sprintGoal: direction.sprintGoal ?? null,
            monthTheme: direction.monthTheme ?? null,
            monthLabel: direction.monthLabel ?? null,
            bhagLine: direction.bhagLine ?? null,
          }}
          weekStart={direction.weekStart}
          onIntentionSaved={direction.reload}
          onStartWeeklyReview={onStartWeeklyReview}
        />
      )}

      {openMust.length > 0 && (
        <section className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-14em)] text-text-muted">
            <Target size={12} className="text-primary" /> Must tygodnia ({openMust.length})
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {openMust.map((pin) => (
              <li
                key={pin.id}
                className="flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-primary/[0.04] p-3 text-xs font-bold text-text-primary shadow-xs"
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

      <WeeklyBalanceHexagon userId={userId} />
    </div>
  );
}
