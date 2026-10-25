import { Compass, Target } from 'lucide-react';
import type { DirectionContextData } from '../../lib/dailyPlanProposal';
import { Card } from '../ui/Card';


interface ThreePillarsProps {
  cialo?: string | null;
  duch?: string | null;
  konto?: string | null;
}

function ThreePillars({ cialo, duch, konto }: ThreePillarsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 pt-1 border-t border-border-custom/30">
      {cialo && (
        <div className="rounded-xl border border-success/20 bg-success/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-success block">Ciało</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{cialo}</p>
        </div>
      )}
      {duch && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-primary block">Duch</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{duch}</p>
        </div>
      )}
      {konto && (
        <div className="rounded-xl border border-warning/20 bg-warning/[0.04] p-2">
          <span className="text-3xs font-black uppercase tracking-wider text-warning block">Konto</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary leading-tight truncate">{konto}</p>
        </div>
      )}
    </div>
  );
}

export default function WeekLoopSummary({
  ctx,
  compact = false,
}: {
  ctx: Pick<DirectionContextData, 'weekGoals' | 'focus'>;
  compact?: boolean;
}) {
  const hasPillars = Boolean(ctx.weekGoals.cialo || ctx.weekGoals.duch || ctx.weekGoals.konto);
  if (!hasPillars && !ctx.focus.skillLabel) return null;

  return (
    <Card className={compact ? 'space-y-3' : 'space-y-4'} padding={compact ? '0.875rem' : '1.25rem'}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-2em)] text-text-muted">
          <Compass size={12} className="text-primary" /> Cele tygodnia
        </p>
        {ctx.focus.skillLabel && (
          <span className="flex items-center gap-1 text-3xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Target size={10} /> Focus: {ctx.focus.skillLabel}
            {ctx.focus.subskillLabel ? ` → ${ctx.focus.subskillLabel}` : ''}
          </span>
        )}
      </div>
      {hasPillars && (
        <ThreePillars
          cialo={ctx.weekGoals.cialo}
          duch={ctx.weekGoals.duch}
          konto={ctx.weekGoals.konto}
        />
      )}
    </Card>
  );
}
