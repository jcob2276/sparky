import { useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { getTodayWarsaw } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceAllocationCard } from './FinanceAllocationCard';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { FinanceGoalCard } from './FinanceGoalCard';
import { FinanceGoalsCard } from './FinanceGoalsCard';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinanceHomeHero } from './FinanceHomeHero';
import { FinanceRecentTransactions } from './FinanceRecentTransactions';
import { FinanceTodayView } from './FinanceTodayView';
import type { FinanceTabKey } from './FinanceTabContent';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceHomeProps {
  data: FinanceBundle;
  metrics: FinanceMetrics;
  holdings: ValuedHolding[];
  quotesLoading: boolean;
  onSaveTarget: (target: number) => void;
  onQuickEntry: (kind: 'expense' | 'income') => void;
  onNavigate: (tab: FinanceTabKey) => void;
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

function MonthFlow({ metrics }: { metrics: FinanceMetrics }) {
  const tiles = [
    { label: 'Wpływy w miesiącu', amount: metrics.earnedThisMonth, icon: ArrowDownLeft, tone: 'bg-success/20 text-success' },
    { label: 'Wydatki w miesiącu', amount: metrics.spentThisMonth, icon: ArrowUpRight, tone: 'bg-danger/20 text-danger' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ label, amount, icon: Icon, tone }) => (
        <div key={label} className="flex items-center gap-3 rounded-3xl bg-surface-1 p-4">
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

export function FinanceHome({ data, metrics, holdings, quotesLoading, onSaveTarget, onQuickEntry, onNavigate, mutations, run }: FinanceHomeProps) {
  const [goalEditing, setGoalEditing] = useState(false);
  const goalRef = useRef<HTMLDivElement>(null);
  const todayDay = Number(getTodayWarsaw().split('-')[2]) || 1;

  const openGoal = () => {
    setGoalEditing(true);
    goalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-6">
      <FinanceHomeHero
        metrics={metrics}
        onQuickEntry={onQuickEntry}
        onGoal={openGoal}
        onMore={() => onNavigate('flows')}
        onAccounts={() => onNavigate('accounts')}
      />
      <FinanceRecentTransactions transactions={data.transactions} onShowAll={() => onNavigate('flows')} />
      <div ref={goalRef}>
        <FinanceGoalCard
          metrics={metrics}
          snapshots={data.snapshots}
          editing={goalEditing}
          onEditingChange={setGoalEditing}
          onSaveTarget={onSaveTarget}
        />
      </div>
      <FinanceHoldingsHeatmap holdings={holdings} loading={quotesLoading} />
      <FinanceGoalsCard
        goals={data.goals}
        onAdd={(input) => void run(async () => { await mutations.addGoal.mutateAsync(input); })}
        onUpdate={(id, current_amount) => void run(async () => { await mutations.updateGoalProgress.mutateAsync({ id, current_amount }); })}
        onRemove={(id) => void run(async () => { await mutations.removeGoal.mutateAsync(id); })}
      />
      <MonthFlow metrics={metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
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
