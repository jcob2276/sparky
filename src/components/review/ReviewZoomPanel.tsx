import { useState } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import Button from '../ui/Button';
import Tabs from '../ui/Tabs';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import type { DueReview } from '../../lib/goal/reviewCycle';
import ReviewMonthView from './ReviewMonthView';
import ReviewSprintGoals from './ReviewSprintGoals';
import ReviewSprintGrid from './ReviewSprintGrid';
import ReviewWeekDetail from './ReviewWeekDetail';

type Zoom = 'week' | 'month' | 'sprint';

const TABS = [
  { key: 'week', label: 'Tydzień' },
  { key: 'month', label: 'Miesiąc' },
  { key: 'sprint', label: 'Sprint' },
];

function PreviousWeek({ context }: { context: ReviewContext }) {
  const [open, setOpen] = useState(false);
  const weeks = context.ladder?.weeks ?? [];
  const current = weeks.find((w) => w.current);
  const previous = current ? weeks.find((w) => w.number === current.number - 1) : undefined;
  if (!previous) return null;
  return (
    <div className="space-y-2 border-t border-border-custom/50 pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        icon={open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        iconPosition="right"
        className="px-0 text-2xs"
      >
        Co zapisałeś tydzień temu
      </Button>
      {open && <ReviewWeekDetail period={previous} title={`Tydzień ${previous.number}/12`} />}
    </div>
  );
}

/**
 * Jedna linia od góry: cel sprintu → miesiąc → tydzień. Przełącznik oddala widok:
 * tydzień (zadania pod celami), miesiąc (4 tygodnie) i cały sprint (12 tygodni), wszystko do wglądu.
 */
export default function ReviewZoomPanel({
  context,
  due,
  embedded = false,
}: {
  context: ReviewContext | undefined;
  due: DueReview;
  /** W arkuszu: bez własnej ramki karty. */
  embedded?: boolean;
}) {
  const [zoom, setZoom] = useState<Zoom>(due.kind === 'sprint' ? 'sprint' : due.kind === 'month' ? 'month' : 'week');
  const ladder = context?.ladder;
  if (!context || (!ladder && !context.sprintGoals && !context.tasks)) return null;

  const month = ladder?.months.find((m) => m.current);
  const week = ladder?.weeks.find((w) => w.current);
  const trail = ladder
    ? [ladder.label, month ? `miesiąc ${month.number}/3` : null, week ? `tydzień ${week.number}/12` : null].filter(Boolean).join(' → ')
    : context.sprintGoals?.label;

  return (
    <section
      className={embedded ? 'space-y-3' : 'space-y-3 rounded-xl border border-border-custom bg-surface p-4 shadow-sm'}
      aria-label="Cele sprintu"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {!embedded && (
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Target size={14} className="text-primary" /> Dokąd to prowadzi
            </h3>
          )}
          {trail && <span className="text-2xs text-text-muted">{trail}</span>}
        </div>
        {ladder && <Tabs tabs={TABS} active={zoom} onChange={(key) => setZoom(key as Zoom)} />}
      </div>

      {(zoom === 'week' || !ladder) && (
        <>
          <ReviewSprintGoals context={context} />
          <PreviousWeek context={context} />
        </>
      )}
      {zoom === 'month' && ladder && <ReviewMonthView ladder={ladder} />}
      {zoom === 'sprint' && ladder && <ReviewSprintGrid ladder={ladder} />}
    </section>
  );
}
