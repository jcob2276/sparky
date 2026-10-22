import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import type { HoldingMutations } from '../../lib/finance/holdingsApi';
import { FinanceTodayView } from './FinanceTodayView';
import { FinanceSubscriptionsPanel } from './FinanceSubscriptionsPanel';
import { FinanceBillsPanel } from './FinanceBillsPanel';
import { FinanceExpensesPanel, FinanceIncomePanel } from './FinanceFlowsPanels';
import { FinanceCsvImportPanel } from './FinanceCsvImportPanel';
import { FinanceBudgetField } from './FinanceBudgetField';
import { FinanceNetWorthHero } from './FinanceNetWorthHero';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinanceAllocationCard } from './FinanceAllocationCard';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import type { FinanceMetrics } from './useFinanceMetrics';
import type { ParsedTransaction } from '../../lib/finance/csvImport';

export type FinanceTabKey = 'dashboard' | 'portfolio' | 'accounts' | 'flows';

interface FinanceTabContentProps {
  tab: FinanceTabKey;
  data: FinanceBundle;
  metrics: FinanceMetrics;
  holdings: ValuedHolding[];
  portfolio: PortfolioTotals;
  quotesLoading: boolean;
  mutations: FinanceMutations;
  holdingMutations: HoldingMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
  saveProfilePatch: (patch: Record<string, number>) => void;
  onOpenQuickEntry: () => void;
}

function FlowsTab({ data, metrics, mutations, run, saveProfilePatch }: Pick<FinanceTabContentProps, 'data' | 'metrics' | 'mutations' | 'run' | 'saveProfilePatch'>) {
  return (
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
        onAdd={(input) => void run(async () => { await mutations.addIncomeSource.mutateAsync(input); })}
        onRemove={(id) => void run(async () => { await mutations.removeIncomeSource.mutateAsync(id); })}
      />
      <FinanceSubscriptionsPanel
        subscriptions={data.subscriptions}
        onAdd={(input) => void run(async () => { await mutations.addSubscription.mutateAsync(input); })}
        onRemove={(id) => void run(async () => { await mutations.removeSubscription.mutateAsync(id); })}
      />
      <FinanceBillsPanel
        bills={data.bills}
        onAdd={(input) => void run(async () => { await mutations.addBill.mutateAsync(input); })}
        onRemove={(id) => void run(async () => { await mutations.removeBill.mutateAsync(id); })}
      />
      <FinanceExpensesPanel
        transactions={data.transactions}
        onAdd={(input) => void run(async () => { await mutations.addTransaction.mutateAsync(input); })}
      />
      <div className="lg:col-span-2">
        <FinanceCsvImportPanel
          importing={mutations.importTransactions.isPending}
          onImport={async (rows: ParsedTransaction[]) => {
            const result = await mutations.importTransactions.mutateAsync(rows);
            notify(`Wgrano ${result.inserted} transakcji${result.skipped > 0 ? `, ${result.skipped} pominięto` : ''}`, 'success');
            return result;
          }}
        />
      </div>
    </div>
  );
}

export function FinanceTabContent(props: FinanceTabContentProps) {
  const { tab, data, metrics, holdings, portfolio, quotesLoading, mutations, holdingMutations, run, saveProfilePatch, onOpenQuickEntry } = props;
  const todayDay = Number(getTodayWarsaw().split('-')[2]) || 1;

  if (tab === 'dashboard') {
    return (
      <div className="space-y-8">
        <FinanceNetWorthHero
          metrics={metrics}
          snapshots={data.snapshots}
          onSaveTarget={(target) => saveProfilePatch({ net_worth_target: target })}
          onOpenQuickEntry={onOpenQuickEntry}
        />
        <FinanceHoldingsHeatmap holdings={holdings} loading={quotesLoading} />
        <div className="grid gap-8 lg:grid-cols-2">
          <FinanceAllocationCard accounts={data.accounts} holdings={holdings} />
          <FinanceEmergencyCard metrics={metrics} />
        </div>
        <FinanceTodayView
          metrics={metrics}
          monthKey={metrics.monthKey}
          cashflow={metrics.cashflowMonth}
          todayDay={todayDay}
          recentTransactions={data.transactions}
        />
      </div>
    );
  }

  if (tab === 'portfolio') {
    return <FinancePortfolioTab holdings={holdings} totals={portfolio} mutations={holdingMutations} run={run} />;
  }

  if (tab === 'accounts') {
    return <FinanceAccountsTab accounts={data.accounts} mutations={mutations} run={run} />;
  }

  return <FlowsTab data={data} metrics={metrics} mutations={mutations} run={run} saveProfilePatch={saveProfilePatch} />;
}
