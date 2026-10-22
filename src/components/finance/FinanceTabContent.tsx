import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { FinanceTodayView } from './FinanceTodayView';
import { FinanceSubscriptionsPanel } from './FinanceSubscriptionsPanel';
import { FinanceBillsPanel } from './FinanceBillsPanel';
import { FinanceExpensesPanel, FinanceIncomePanel } from './FinanceFlowsPanels';
import { FinanceCsvImportPanel } from './FinanceCsvImportPanel';
import { FinanceBudgetField } from './FinanceBudgetField';
import type { FinanceMetrics } from './useFinanceMetrics';
import type { ParsedTransaction } from '../../lib/finance/csvImport';

export type FinanceTabKey = 'today' | 'flows';

interface FinanceTabContentProps {
  tab: FinanceTabKey;
  data: FinanceBundle;
  metrics: FinanceMetrics;
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
  saveProfilePatch: (patch: Record<string, number>) => void;
}

export function FinanceTabContent(props: FinanceTabContentProps) {
  const { tab, data, metrics, mutations, run, saveProfilePatch } = props;
  const todayDay = Number(getTodayWarsaw().split('-')[2]) || 1;

  if (tab === 'today') {
    return (
      <FinanceTodayView
        metrics={metrics}
        monthKey={metrics.monthKey}
        cashflow={metrics.cashflowMonth}
        todayDay={todayDay}
        recentTransactions={data.transactions}
        onAddExpense={(input) => void run(async () => { await mutations.addTransaction.mutateAsync(input); })}
        addingExpense={mutations.addTransaction.isPending}
      />
    );
  }

  return (
    <div className="space-y-8">
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
    </div>
  );
}
