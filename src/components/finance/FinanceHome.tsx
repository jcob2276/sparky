import { useState } from 'react';
import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { FinanceGoalCard } from './FinanceGoalCard';
import { FinanceGoalsCard } from './FinanceGoalsCard';
import { FinanceHomeHero } from './FinanceHomeHero';
import { FinanceMonthCard } from './FinanceMonthCard';
import { FinanceOnboardingCard } from './FinanceOnboardingCard';
import { FinanceBankCard } from './FinanceBankCard';
import type { FinanceTabKey } from './FinanceTabContent';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceHomeProps {
  data: FinanceBundle;
  metrics: FinanceMetrics;
  holdings: ValuedHolding[];
  portfolio: PortfolioTotals;
  onSaveTarget: (target: number) => void;
  onNavigate: (tab: FinanceTabKey) => void;
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

export function FinanceHome({
  data,
  metrics,
  holdings,
  portfolio,
  onSaveTarget,
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
      />
      <FinanceOnboardingCard
        state={{
          hasAccounts: data.accounts.length > 0,
          hasHoldings: holdings.length > 0,
          hasBudget: metrics.hasBudget,
        }}
        onNavigate={onNavigate}
      />
      <FinanceMonthCard metrics={metrics} onOpenFlows={() => onNavigate('flows')} />
      <FinanceBankCard mode="overview" financeAccounts={data.accounts} onOpenDetails={() => onNavigate('flows')} onManageAccounts={() => onNavigate('accounts')} />

      <section className="space-y-2" aria-label="Cele">
        <h2 className="ios-section-title px-1">Cele</h2>
        <div className="ios-group divide-y divide-border-custom/20">
        <FinanceGoalCard
          metrics={metrics}
          editing={goalEditing}
          onEditingChange={setGoalEditing}
          onSaveTarget={onSaveTarget}
        />
        <FinanceEmergencyCard metrics={metrics} />
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
        </div>
      </section>
    </div>
  );
}
