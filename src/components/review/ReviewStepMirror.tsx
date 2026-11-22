import type { DueReview } from '../../lib/goal/reviewCycle';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import ReviewAiSection from './ReviewAiSection';
import ReviewFactsPanel from './ReviewFactsPanel';
import ReviewKpiTiles from './ReviewKpiTiles';
import ReviewZoomPanel from './ReviewZoomPanel';

/**
 * Krok 1: tydzień jak w lustrze. Najpierw analiza i trzy liczby, pod nimi tydzień dzień po dniu;
 * liczby szczegółowe, wydatki i notatki są zwinięte. Miesiąc i sprint pokazują zamiast tego drabinkę celów.
 */
export default function ReviewStepMirror({
  userId,
  due,
  context,
  facts,
  gaps,
}: {
  userId?: string;
  due: DueReview;
  context: ReviewContext | undefined;
  facts: string[];
  gaps: string[];
}) {
  if (due.kind !== 'week') {
    const hasZoom = Boolean(context && (context.ladder || context.sprintGoals || context.tasks));
    return hasZoom ? (
      <ReviewZoomPanel context={context} due={due} />
    ) : (
      <p className="rounded-xl border border-border-custom bg-surface p-4 text-sm leading-relaxed text-text-secondary shadow-sm">
        Zamykasz: {due.label}. Za chwilę ocenisz trzy filary, a potem ustawisz cele na kolejny okres.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {userId && (
        <ReviewAiSection userId={userId} weekStart={due.periodStart} contextReady={context !== undefined} contextRecap={context?.aiRecap} />
      )}
      <ReviewKpiTiles context={context} />
      <ReviewFactsPanel facts={facts} gaps={gaps} context={context} />
    </div>
  );
}
