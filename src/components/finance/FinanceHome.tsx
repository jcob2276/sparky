import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { formatPln } from '../../lib/finance/formatMoney';
import { buildBudgetProgress } from '../../lib/finance/financeTodayInsights';
import Button from '../ui/Button';
import { FinanceAllocationCard } from './FinanceAllocationCard';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { FinanceGoalCard } from './FinanceGoalCard';
import { FinanceGoalsCard } from './FinanceGoalsCard';
import { FinanceHomeHero } from './FinanceHomeHero';
import { FinanceOnboardingCard } from './FinanceOnboardingCard';
import { FinanceBankCard } from './FinanceBankCard';
import { buildTodayContext, buildTodayHeadline, formatMonthLabel } from './financeNarrative';
import type { FinanceTabKey } from './FinanceTabContent';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceHomeProps {
  data: FinanceBundle;
  metrics: FinanceMetrics;
  holdings: ValuedHolding[];
  portfolio: PortfolioTotals;
  onSaveTarget: (target: number) => void;
  onQuickEntry: (kind: 'expense' | 'income') => void;
  onNavigate: (tab: FinanceTabKey) => void;
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

function MonthFlow({ metrics }: { metrics: FinanceMetrics }) {
  const tiles = [
    {
      label: 'Wpływy w miesiącu',
      amount: metrics.earnedThisMonth,
      icon: ArrowDownLeft,
      tone: 'bg-success/20 text-success',
    },
    {
      label: 'Wydatki w miesiącu',
      amount: metrics.spentThisMonth,
      icon: ArrowUpRight,
      tone: 'bg-danger/20 text-danger',
    },
    {
      label: 'Zwroty w miesiącu',
      amount: metrics.refundsThisMonth,
      icon: ArrowDownLeft,
      tone: 'bg-surface-2 text-text-secondary',
    },
  ].filter(tile => tile.label !== 'Zwroty w miesiącu' || tile.amount > 0);
  return (
    <div className={`grid grid-cols-2 gap-3 ${tiles.length === 3 ? 'sm:grid-cols-3' : ''}`}>
      {tiles.map(({ label, amount, icon: Icon, tone }) => (
        <div key={label} className="flex items-center gap-3 rounded-lg bg-surface-1 p-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">{label}</p>
            <p className="truncate text-base font-semibold tabular-nums">{formatPln(amount)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinanceHome({
  data,
  metrics,
  holdings,
  portfolio,
  onSaveTarget,
  onQuickEntry,
  onNavigate,
  mutations,
  run,
}: FinanceHomeProps) {
  const [goalEditing, setGoalEditing] = useState(false);
  const headline = buildTodayHeadline(metrics);
  const context = buildTodayContext(metrics);
  const monthLabel = formatMonthLabel(metrics.monthKey);
  const budgetProgress = buildBudgetProgress({
    effectiveExpenses: metrics.effectiveExpenses,
    spentThisMonth: metrics.spentThisMonth,
  });

  return (
    <div className="ui-stagger space-y-6">
      <FinanceHomeHero
        metrics={metrics}
        portfolio={portfolio}
        hasHoldings={holdings.length > 0}
        hasAccounts={data.accounts.length > 0}
        onQuickEntry={onQuickEntry}
      />
      <FinanceOnboardingCard
        state={{
          hasAccounts: data.accounts.length > 0,
          hasHoldings: holdings.length > 0,
          hasBudget: metrics.hasBudget,
        }}
        onNavigate={onNavigate}
      />
      <MonthFlow metrics={metrics} />
      <FinanceBankCard mode="overview" financeAccounts={data.accounts} onOpenDetails={() => onNavigate('flows')} onManageAccounts={() => onNavigate('accounts')} />

      {metrics.hasBudget ? (
        <div className="rounded-2xl border border-border-custom/25 bg-surface-1/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-text-muted">Na dziś zostaje około</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary tabular-nums">
                {headline}
                <span className="ml-2 text-xs font-normal text-text-muted">/ dzień do końca miesiąca</span>
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('flows')} className="text-xs text-primary hover:underline">
              Plan i przepływy →
            </Button>
          </div>
          {context && <p className="mt-2 text-xs leading-relaxed text-text-secondary">{context}</p>}

          {budgetProgress && (
            <div className="mt-4 space-y-2.5 border-t border-border-custom/15 pt-4">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-text-muted">
                  Wydane: <strong className="tabular-nums text-text-primary">{formatPln(budgetProgress.spent)}</strong>
                </span>
                <span className="text-text-muted">
                  Plan miesiąca: <strong className="tabular-nums text-text-secondary">{formatPln(budgetProgress.plan)}</strong>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2/80">
                <div
                  className={`h-full rounded-full transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-out)] ${
                    budgetProgress.overBudget ? 'bg-warning' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(100, budgetProgress.plan > 0 ? (budgetProgress.spent / budgetProgress.plan) * 100 : 0)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{monthLabel}</span>
                <span className={budgetProgress.overBudget ? 'font-medium text-warning' : 'text-text-secondary'}>
                  {budgetProgress.overBudget
                    ? `+${formatPln(budgetProgress.spent - budgetProgress.plan)} ponad plan`
                    : `Zostało ${formatPln(budgetProgress.remaining)} do planu`}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border-custom/30 bg-surface-1/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-secondary">Ustal miesięczny plan wydatków</p>
            <p className="text-xs text-text-muted">Dzięki temu Sparky policzy dzienny bezpieczny limit do końca miesiąca.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate('flows')}>
            Ustaw plan
          </Button>
        </div>
      )}

      <section className="space-y-6" aria-label="Cele i struktura majątku">
        <h2 className="text-sm font-semibold text-text-secondary">Cele i struktura majątku</h2>
        <FinanceGoalCard
          metrics={metrics}
          snapshots={data.snapshots}
          editing={goalEditing}
          onEditingChange={setGoalEditing}
          onSaveTarget={onSaveTarget}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <FinanceEmergencyCard metrics={metrics} />
          <FinanceAllocationCard accounts={data.accounts} holdings={holdings} />
        </div>
        <FinanceGoalsCard
          goals={data.goals}
          onAdd={(input) =>
            void run(async () => {
              await mutations.addGoal.mutateAsync(input);
            })
          }
          onUpdate={(id, current_amount) =>
            void run(async () => {
              await mutations.updateGoalProgress.mutateAsync({
                id,
                current_amount,
              });
            })
          }
          onRemove={(id) =>
            void run(async () => {
              await mutations.removeGoal.mutateAsync(id);
            })
          }
        />
      </section>
    </div>
  );
}
