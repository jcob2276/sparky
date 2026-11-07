import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import type { HoldingMutations } from '../../lib/finance/holdingsApi';
import { FinanceHome } from './FinanceHome';
import { FinanceSubscriptionsPanel } from './FinanceSubscriptionsPanel';
import { FinanceBillsPanel } from './FinanceBillsPanel';
import { FinanceIncomePanel } from './FinanceFlowsPanels';
import { FinanceBudgetField } from './FinanceBudgetField';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import { FinanceBankCard } from './FinanceBankCard';
import { FinanceManualHistory } from './FinanceManualHistory';
import { FinanceTodayView } from './FinanceTodayView';
import { FinanceSalesGoalCard } from './FinanceSalesGoalCard';
import { getTodayWarsaw } from '../../lib/date';
import type { FinanceMetrics } from './useFinanceMetrics';

export type FinanceTabKey = 'dashboard' | 'portfolio' | 'accounts' | 'flows';

interface FinanceTabContentProps {
  tab: FinanceTabKey;
  data: FinanceBundle;
  metrics: FinanceMetrics;
  holdings: ValuedHolding[];
  portfolio: PortfolioTotals;
  mutations: FinanceMutations;
  holdingMutations: HoldingMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
  saveProfilePatch: (patch: Record<string, number>) => void;
  onQuickEntry: (kind: 'expense' | 'income') => void;
  onNavigate: (tab: FinanceTabKey) => void;
}

function FlowsTab({
  data,
  metrics,
  mutations,
  run,
  saveProfilePatch,
  onNavigate,
}: Pick<FinanceTabContentProps, 'data' | 'metrics' | 'mutations' | 'run' | 'saveProfilePatch' | 'onNavigate'>) {
  return (
    <div className="space-y-6">
      <FinanceBankCard mode="activity" financeAccounts={data.accounts} onManageAccounts={() => onNavigate('accounts')} />
      <FinanceManualHistory transactions={data.transactions.filter((tx) => tx.source !== 'bank')} />
      <details className="space-y-6">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-text-secondary">Plan i stałe płatności</summary>
        <FinanceTodayView
          metrics={metrics}
          monthKey={metrics.monthKey}
          cashflow={metrics.cashflowMonth}
          todayDay={Number(getTodayWarsaw().slice(-2))}
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <FinanceBudgetField
              key={metrics.effectiveExpenses}
              monthlyExpenses={metrics.effectiveExpenses}
              onSave={(amount) => saveProfilePatch({ monthly_expenses: amount })}
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
      </details>
    </div>
  );
}

export function FinanceTabContent(props: FinanceTabContentProps) {
  const { tab, data, metrics, holdings, portfolio, mutations, holdingMutations, run, saveProfilePatch, onQuickEntry, onNavigate } = props;

  if (tab === 'dashboard') {
    return (
      <FinanceHome
        data={data}
        metrics={metrics}
        holdings={holdings}
        portfolio={portfolio}
        onSaveTarget={(target) => saveProfilePatch({ net_worth_target: target })}
        onQuickEntry={onQuickEntry}
        onNavigate={onNavigate}
        mutations={mutations}
        run={run}
      />
    );
  }

  if (tab === 'portfolio') {
    return (
      <FinancePortfolioTab
        holdings={holdings}
        totals={portfolio}
        mutations={holdingMutations}
        run={run}
        fundingAccounts={data.accounts}
        brokerCashPln={data.accounts.filter((a) => a.account_type === 'broker_cash').reduce((s, a) => s + a.balance, 0)}
      />
    );
  }

  if (tab === 'accounts') {
    return <FinanceAccountsTab accounts={data.accounts} mutations={mutations} run={run} />;
  }

  return (
    <FlowsTab data={data} metrics={metrics} mutations={mutations} run={run} saveProfilePatch={saveProfilePatch} onNavigate={onNavigate} />
  );
}
