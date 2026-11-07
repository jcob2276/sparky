import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceAllocationCard } from './FinanceAllocationCard';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { FinanceGoalCard } from './FinanceGoalCard';
import { FinanceGoalsCard } from './FinanceGoalsCard';
import { FinanceHomeHero } from './FinanceHomeHero';
import { FinanceOnboardingCard } from './FinanceOnboardingCard';
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
      <section className="space-y-6" aria-label="Cele i struktura majątku">
        <h2 className="text-sm font-semibold text-text-secondary">Cele i struktura majątku</h2>
        <FinanceGoalCard
          metrics={metrics}
          snapshots={data.snapshots}
          editing={goalEditing}
          onEditingChange={setGoalEditing}
          onSaveTarget={onSaveTarget}
        />
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
        <div className="grid gap-6 lg:grid-cols-2">
          <FinanceAllocationCard accounts={data.accounts} holdings={holdings} />
          <FinanceEmergencyCard metrics={metrics} />
        </div>
      </section>
    </div>
  );
}
