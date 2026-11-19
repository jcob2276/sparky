import type { PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { FinanceBundle } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import type { HoldingMutations } from '../../lib/finance/holdingsApi';
import { FinanceHome } from './FinanceHome';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import { FlowsTab } from './FlowsTab';
import type { FinanceMetrics } from './useFinanceMetrics';

export type FinanceTabKey = 'dashboard' | 'portfolio' | 'accounts' | 'flows' | 'analysis' | 'tools';

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
  onNavigate: (tab: FinanceTabKey) => void;
}

export function FinanceTabContent(props: FinanceTabContentProps) {
  const { tab, data, metrics, holdings, portfolio, mutations, holdingMutations, run, saveProfilePatch, onNavigate } = props;

  if (tab === 'tools') {
    return (
      <>
      <FlowsTab data={data} metrics={metrics} mutations={mutations} run={run} saveProfilePatch={saveProfilePatch}
        onNavigate={onNavigate} initialSegment="planning" />
      <details className="finance-reference-card">
      <summary>Cele, poduszka i kalkulatory</summary>
      <FinanceHome
        data={data}
        metrics={metrics}
        holdings={holdings}
        portfolio={portfolio}
        onSaveTarget={(target) => saveProfilePatch({ net_worth_target: target })}
        onNavigate={onNavigate}
        mutations={mutations}
        run={run}
      />
      </details>
      </>
    );
  }

  if (tab === 'portfolio') {
    return (
      <FinancePortfolioTab
        holdings={holdings}
        mutations={holdingMutations}
        run={run}
        accounts={data.accounts}
        brokerCashPln={data.accounts.filter((a) => a.account_type === 'broker_cash').reduce((s, a) => s + a.balance, 0)}
      />
    );
  }

  if (tab === 'accounts') {
    return <FinanceAccountsTab accounts={data.accounts} mutations={mutations} run={run} />;
  }

  return null;
}
