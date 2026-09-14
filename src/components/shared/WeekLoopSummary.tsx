
import { Compass, Sparkles, Target, Award } from 'lucide-react';
import type { DirectionContextData } from '../../lib/dailyPlanProposal';
import { Card } from '../ui/Card';

function norm(text: string | null | undefined): string {
  return (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = norm(a);
  const nb = norm(b);
  return na.length > 0 && na === nb;
}

function truncate(text: string, max = 110): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function WeekLoopSummary({
  ctx,
  compact = false,
  onStartWeeklyReview,
}: {
  ctx: Pick<
    DirectionContextData,
    | 'weekGoals'
    | 'weekGoalsMeta'
    | 'focus'
    | 'sprintGoal'
    | 'monthTheme'
    | 'monthLabel'
    | 'bhagLine'
  >;
  compact?: boolean;
  onStartWeeklyReview?: () => void;
}) {
  const intention = (ctx.weekGoals.intention || ctx.weekGoals.commitment)?.trim() || null;
  const bhag = ctx.bhagLine?.trim() || null;
  const month = ctx.monthTheme?.trim() || null;
  const sprint = ctx.sprintGoal?.trim() || null;

  const showSprint = Boolean(sprint && !sameText(sprint, month) && !sameText(sprint, bhag));
  const showWeek = Boolean(
    intention && !sameText(intention, month) && !sameText(intention, sprint) && !sameText(intention, bhag),
  );

  return (
    <Card className={compact ? 'space-y-3' : 'space-y-4'} padding={compact ? '0.875rem' : '1.25rem'}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-muted">
          <Compass size={12} className="text-primary" /> Strategia & Intencja Tygodnia
        </p>
        {ctx.focus.skillLabel && (
          <span className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Target size={10} /> Focus: {ctx.focus.skillLabel}
            {ctx.focus.subskillLabel ? ` → ${ctx.focus.subskillLabel}` : ''}
          </span>
        )}
      </div>

      {/* Strategic Lineage chain: Rok -> Miesiąc -> Sprint */}
      <div className="rounded-xl border border-border-custom/30 bg-surface/40 p-2.5 space-y-2 text-xs">
        {bhag && (
          <div className="flex items-start gap-2">
            <span className="text-3xs font-black uppercase tracking-widest text-text-muted shrink-0 w-14 pt-0.5">
              Rok
            </span>
            <p className="text-text-secondary leading-snug font-medium flex-1">
              {truncate(bhag, 120)}
            </p>
          </div>
        )}

        {month && (
          <div className="flex items-start gap-2">
            <span className="text-3xs font-black uppercase tracking-widest text-primary shrink-0 w-14 pt-0.5">
              {ctx.monthLabel ? ctx.monthLabel : 'Miesiąc'}
            </span>
            <p className="text-text-primary font-semibold leading-snug flex-1">
              {month}
            </p>
          </div>
        )}

        {showSprint && (
          <div className="flex items-start gap-2">
            <span className="text-3xs font-black uppercase tracking-widest text-primary shrink-0 w-14 pt-0.5">
              Sprint
            </span>
            <p className="text-text-primary font-semibold leading-snug flex-1">
              {sprint}
            </p>
          </div>
        )}
      </div>

      {/* Hero: Ten Tydzień */}
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-3xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Sparkles size={11} /> Intencja bieżącego tygodnia
          </span>
          {ctx.weekGoalsMeta?.source === 'fallback' && (
            <span className="text-3xs font-extrabold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              Z poprzedniego tyg.
            </span>
          )}
        </div>

        {showWeek ? (
          <p className="text-sm font-bold text-text-primary leading-snug">
            {intention}
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-xs text-text-muted">
              Nie określono jeszcze głównej intencji na ten tydzień.
            </p>
            {onStartWeeklyReview && (
              <button
                type="button"
                onClick={onStartWeeklyReview}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition-all hover:opacity-90 active:scale-95 shrink-0"
              >
                <Award size={12} /> Ustal intencję tygodnia
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3 Pillars */}
      {(ctx.weekGoals.cialo || ctx.weekGoals.duch || ctx.weekGoals.konto) && !compact && (
        <div className="grid gap-2 sm:grid-cols-3 pt-1 border-t border-border-custom/30">
          {ctx.weekGoals.cialo && (
            <div className="rounded-xl border border-success/20 bg-success/[0.04] p-2">
              <span className="text-3xs font-black uppercase tracking-wider text-success block">Ciało</span>
              <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{ctx.weekGoals.cialo}</p>
            </div>
          )}
          {ctx.weekGoals.duch && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-2">
              <span className="text-3xs font-black uppercase tracking-wider text-primary block">Duch</span>
              <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{ctx.weekGoals.duch}</p>
            </div>
          )}
          {ctx.weekGoals.konto && (
            <div className="rounded-xl border border-warning/20 bg-warning/[0.04] p-2">
              <span className="text-3xs font-black uppercase tracking-wider text-warning block">Konto</span>
              <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{ctx.weekGoals.konto}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

