import { useState } from 'react';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { getTodayWarsaw } from '../../lib/date';
import Tabs from '../ui/Tabs';
import { FinanceSubscriptionsPanel } from './FinanceSubscriptionsPanel';
import { FinanceBillsPanel } from './FinanceBillsPanel';
import { FinanceIncomePanel } from './FinanceFlowsPanels';
import { FinanceBudgetField } from './FinanceBudgetField';
import { FinanceBankCard } from './FinanceBankCard';
import { FinanceManualHistory } from './FinanceManualHistory';
import { FinanceMonthlyFlowsChart } from './FinanceMonthlyFlowsChart';
import { FinanceLifeInsights } from './FinanceLifeInsights';
import { FinanceTodayView } from './FinanceTodayView';
import { FinanceSalesGoalCard } from './FinanceSalesGoalCard';
import type { FinanceMetrics } from './useFinanceMetrics';
import type { FinanceTabKey } from './FinanceTabContent';

export interface FlowsTabProps {
  data: FinanceBundle;
  metrics: FinanceMetrics;
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
  saveProfilePatch: (patch: Record<string, number>) => void;
  onNavigate: (tab: FinanceTabKey) => void;
}

const FLOW_TABS = [
  { key: 'activity', label: 'Transakcje' },
  { key: 'planning', label: 'Plan i stałe płatności' },
];

export function FlowsTab({
  data,
  metrics,
  mutations,
  run,
  saveProfilePatch,
  onNavigate,
}: FlowsTabProps) {
  const [segment, setSegment] = useState<'activity' | 'planning'>('activity');

  return (
    <div className="space-y-6">
      <Tabs
        tabs={FLOW_TABS}
        active={segment}
        onChange={(key) => setSegment(key as 'activity' | 'planning')}
      />

      {segment === 'activity' && (
        <div className="space-y-6">
          <FinanceMonthlyFlowsChart transactions={data.transactions} />
          <FinanceLifeInsights />
          <FinanceBankCard mode="activity" financeAccounts={data.accounts} onManageAccounts={() => onNavigate('accounts')} />
          <FinanceManualHistory transactions={data.transactions.filter((tx) => tx.source !== 'bank')} />
        </div>
      )}

      {segment === 'planning' && (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="lg:col-span-2 space-y-8">
              <FinanceBudgetField
                key={metrics.effectiveExpenses}
                monthlyExpenses={metrics.effectiveExpenses}
                onSave={(amount) => saveProfilePatch({ monthly_expenses: amount })}
              />
              <FinanceTodayView
                monthKey={metrics.monthKey}
                cashflow={metrics.cashflowMonth}
                todayDay={Number(getTodayWarsaw().slice(-2))}
              />
            </div>
            <FinanceIncomePanel
              sources={data.incomeSources}
              onAdd={(input) =>
                void run(async () => {
                  await mutations.addIncomeSource.mutateAsync(input);
                })
              }
              onRemove={(id) =>
                void run(async () => {
                  await mutations.removeIncomeSource.mutateAsync(id);
                })
              }
            />
            <FinanceSubscriptionsPanel
              subscriptions={data.subscriptions}
              onAdd={(input) =>
                void run(async () => {
                  await mutations.addSubscription.mutateAsync(input);
                })
              }
              onRemove={(id) =>
                void run(async () => {
                  await mutations.removeSubscription.mutateAsync(id);
                })
              }
            />
            <FinanceBillsPanel
              bills={data.bills}
              onAdd={(input) =>
                void run(async () => {
                  await mutations.addBill.mutateAsync(input);
                })
              }
              onRemove={(id) =>
                void run(async () => {
                  await mutations.removeBill.mutateAsync(id);
                })
              }
            />
            <FinanceSalesGoalCard />
          </div>
        </div>
      )}
    </div>
  );
}
