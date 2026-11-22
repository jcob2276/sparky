import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '../../store/useStore';
import { useWarsawDayChange } from '../../hooks/useWarsawDayChange';
import { getTodayWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { buildWeekReport, useWeekFacts } from '../../lib/goal/weekFacts';
import { closeReview, fetchDueReviews, fetchReviewContext, type ReviewAnswers } from '../../lib/goal/reviewCycle.data';
import type { DueReview } from '../../lib/goal/reviewCycle';
import { goalSpineKeys, reviewCycleKeys } from '../../lib/queryKeys';
import FullscreenExperience from '../ui/FullscreenExperience';
import ReviewForm from './ReviewForm';

function ReviewBody({ userId, due, remaining, facts, gaps }: { userId: string; due: DueReview; remaining: number; facts: string[]; gaps: string[] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const context = useQuery({
    queryKey: reviewCycleKeys.context(userId, due.key),
    queryFn: () => fetchReviewContext(userId, due),
    staleTime: 60_000,
  });

  const submit = async (answers: ReviewAnswers) => {
    setSaving(true);
    try {
      await closeReview(userId, due, answers);
      notify('Przegląd zamknięty, cele ustawione', 'success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewCycleKeys.all }),
        queryClient.invalidateQueries({ queryKey: goalSpineKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['spine-guidance'] }),
      ]);
    } catch (err) {
      notify('Nie udało się zapisać przeglądu. Spróbuj jeszcze raz.', 'error');
      console.warn('[ReviewGate] closeReview error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReviewForm
      key={due.key}
      userId={userId}
      due={due}
      context={context.data}
      facts={facts}
      gaps={gaps}
      saving={saving}
      remaining={remaining}
      onSubmit={(answers) => { void submit(answers); }}
    />
  );
}

function WeekReviewBody({ userId, due, remaining }: { userId: string; due: DueReview; remaining: number }) {
  const facts = useWeekFacts(userId, due.periodStart);
  const report = facts.data ? buildWeekReport(facts.data) : { lines: [], gaps: [] };
  return <ReviewBody userId={userId} due={due} remaining={remaining} facts={report.lines} gaps={report.gaps} />;
}

/**
 * Blokada aplikacji do czasu zamknięcia zaległego przeglądu (tydzień, miesiąc, sprint).
 * Błąd lub ładowanie nigdy nie blokują: zamek zakłada się tylko, gdy wiemy na pewno, że coś jest zaległe.
 */
export default function ReviewGate() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const today = getTodayWarsaw();
  const query = useQuery({
    queryKey: reviewCycleKeys.due(userId ?? '', today),
    queryFn: () => fetchDueReviews(userId ?? '', today),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  useWarsawDayChange(() => { void queryClient.invalidateQueries({ queryKey: reviewCycleKeys.all }); });

  const queue = query.data ?? [];
  const due = queue[0];
  if (!userId || !due) return null;

  return (
    <FullscreenExperience label={due.label} className="overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-6 lg:max-w-xl">
        {due.kind === 'week'
          ? <WeekReviewBody userId={userId} due={due} remaining={queue.length - 1} />
          : <ReviewBody userId={userId} due={due} remaining={queue.length - 1} facts={[]} gaps={[]} />}
      </div>
    </FullscreenExperience>
  );
}
