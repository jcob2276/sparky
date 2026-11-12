import { ArrowDownLeft, ArrowUpRight, ChevronRight, RotateCcw, type LucideIcon } from 'lucide-react';
import { formatPln } from '../../lib/finance/formatMoney';
import { buildBudgetProgress } from '../../lib/finance/financeTodayInsights';
import { Pressable } from '../ui/ControlPrimitives';
import { buildTodayContext, formatMonthLabel } from './financeNarrative';
import { Money } from './FinanceMoney';
import type { FinanceMetrics } from './useFinanceMetrics';

interface Props {
  metrics: FinanceMetrics;
  /** Opens Przepływy, where the month is planned and its history lives. */
  onOpenFlows: () => void;
}

function Row({ icon: Icon, tone, label, amount, caption }: { icon: LucideIcon; tone: string; label: string; amount: number; caption?: string }) {
  return (
    <div className="min-h-12 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={16} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-text-primary">{label}</span>
          {caption && <span className="block text-xs text-text-muted">{caption}</span>}
        </span>
        <Money value={amount} className="text-base font-semibold text-text-primary" />
      </div>
    </div>
  );
}

/**
 * The single place on Pulpit that answers "how is this month going": what is left per day, plan vs spent, income and spending.
 * Details and planning live in Przepływy; nothing here repeats there.
 */
export function FinanceMonthCard({ metrics, onOpenFlows }: Props) {
  const progress = buildBudgetProgress({ effectiveExpenses: metrics.effectiveExpenses, spentThisMonth: metrics.spentThisMonth });
  const context = buildTodayContext(metrics);
  const barPct = progress && progress.plan > 0 ? Math.min(100, (progress.spent / progress.plan) * 100) : 0;

  return (
    <section aria-label="Ten miesiąc">
      <header className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="ios-section-title capitalize">{formatMonthLabel(metrics.monthKey)}</h2>
        <Pressable type="button" onClick={onOpenFlows} className="flex items-center gap-0.5 text-sm font-medium text-primary">
          Przepływy<ChevronRight size={16} aria-hidden="true" />
        </Pressable>
      </header>
      <div className="ios-group">
        {metrics.hasBudget ? (
          <div className="space-y-3 px-4 py-4">
            <div>
              <p className="text-xs text-text-muted">Na dziś zostaje około</p>
              <p className="mt-0.5 text-4xl font-bold tracking-tight text-text-primary">
                <Money value={metrics.safeToSpend.safeToday} />
                <span className="ml-2 text-xs font-normal text-text-muted">/ dzień do końca miesiąca</span>
              </p>
            </div>
            {progress && (
              <div className="space-y-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-out)] ${progress.overBudget ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${barPct}%` }} />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>Wydane <strong className="tabular-nums text-text-primary">{formatPln(progress.spent)}</strong> z {formatPln(progress.plan)}</span>
                  <span className={progress.overBudget ? 'font-medium text-warning' : 'text-text-secondary'}>
                    {progress.overBudget ? `+${formatPln(progress.spent - progress.plan)} ponad plan` : `Zostało ${formatPln(progress.remaining)}`}
                  </span>
                </div>
              </div>
            )}
            {context && <p className="text-xs leading-relaxed text-text-secondary">{context}</p>}
          </div>
        ) : (
          <Pressable type="button" onClick={onOpenFlows} className="flex w-full items-center gap-3 px-4 py-4 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-primary">Ustal miesięczny plan wydatków</span>
              <span className="block text-xs text-text-muted">Sparky policzy wtedy, ile możesz wydać dziennie do końca miesiąca.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
          </Pressable>
        )}
        <div className="ios-glass-divider" role="separator" />
        <Row icon={ArrowDownLeft} tone="bg-success/15 text-success" label="Wpływy" amount={metrics.earnedThisMonth} />
        <div className="ios-glass-divider" role="separator" />
        <Row icon={ArrowUpRight} tone="bg-danger/15 text-danger" label="Wydatki" amount={metrics.spentThisMonth} />
        {metrics.refundsThisMonth > 0 && (
          <>
            <div className="ios-glass-divider" role="separator" />
            <Row icon={RotateCcw} tone="bg-surface-2 text-text-secondary" label="Zwroty" amount={metrics.refundsThisMonth} />
          </>
        )}
      </div>
    </section>
  );
}
