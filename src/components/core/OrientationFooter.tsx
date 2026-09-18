import { useEffect, useRef, useState } from 'react';
import { fetchSprintContext } from '../../lib/goal/goalSpine';
import { useGoalSpineInvalidation } from '../../hooks/useGoalSpineInvalidation';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { useUserId } from '../../store/useStore';
import { Card } from '../ui/Card';

import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';

const BORN = new Date('2002-07-06');

export default function OrientationFooter() {
  const userId = useUserId();
  const [lived] = useState(() => Math.floor((Date.now() - BORN.getTime()) / 86400000));
  const fuel = getDailyFuelQuote(lived);
  const sprint = getSprintInfo();
  const [sprintGoal, setSprintGoal] = useState<string | null>(null);
  const loadRef = useRef(() => {
    if (userId) void fetchSprintContext(userId).then((ctx) => setSprintGoal(ctx.goalText));
  });

  useEffect(() => {
    loadRef.current = () => {
      if (userId) void fetchSprintContext(userId).then((ctx) => setSprintGoal(ctx.goalText));
    };
    loadRef.current();
  }, [userId, sprint.personalYear, sprint.sprintNumber]);

  useGoalSpineInvalidation(() => loadRef.current());

  return (
    <Card
      variant="outline"
      className="animate-fadeIn"
      style={{
        border: 'var(--border-orientation-footer)',
        background: 'var(--surface-orientation-footer)',
      }}
      padding="0"
    >
      <div className="px-5 py-4 border-l-4 border-primary/40">
        <p className="font-display text-base font-medium leading-relaxed text-text-primary italic whitespace-pre-line">
          „{fuel.text}”
        </p>
        {fuel.author && (
          <p className="mt-1 text-2xs font-bold text-text-muted">
            — {fuel.author}{fuel.source ? `, ${fuel.source}` : ''}
          </p>
        )}
      </div>

      <div className="px-5 py-3.5 border-t border-primary/10 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-muted">
            PY{sprint.personalYear}
          </span>
          <span className="text-text-muted/30">·</span>
          <span className="text-2xs font-black uppercase tracking-wider text-primary">
            Sprint {sprint.sprintNumber} · {SPRINT_SEASON[sprint.sprintNumber]}
          </span>
          <span className="ml-auto text-2xs font-bold text-text-muted">
            tydz. {sprint.weekInSprint}/12 · {sprint.pct}%
          </span>
        </div>

        {sprintGoal && (
          <p className="text-sm font-bold text-text-primary leading-snug">{sprintGoal}</p>
        )}

        <div className="h-1.5 bg-border-custom rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary/80 ui-interactive" style={{ width: `${sprint.pct}%` }} />
        </div>

        <p className="text-2xs font-bold uppercase tracking-[var(--ds-arbitrary-0-18em)] text-primary/40">
          Dzień {lived.toLocaleString('pl-PL')} życia
        </p>
      </div>
    </Card>
  );
}
