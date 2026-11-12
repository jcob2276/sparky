import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useFinanceMutations } from '../../lib/financeApi';
import { useCashEntryMutation, type CashEntryInput } from '../../lib/finance/cashEntryApi';
import { useHoldingMutations } from '../../lib/finance/holdingsApi';
import { useNetWorthSnapshotSync } from '../../lib/finance/netWorthSnapshots';
import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import ContentContainer from '../shared/ContentContainer';
import { WorkspaceHeader } from '../shared/WorkspaceHeader';
import { FinanceSkeleton } from './FinanceSkeleton';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceTabContent, type FinanceTabKey } from './FinanceTabContent';
import { FinanceBottomNav } from './FinanceBottomNav';
import { FinanceQuickEntry } from './FinanceQuickEntry';
import { useFinancePageData } from './useFinancePageData';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { FinanceBankCard } from './FinanceBankCard';
import { FinanceManualHistory } from './FinanceManualHistory';

const TITLES: Record<FinanceTabKey, string> = {
  dashboard: 'Finanse',
  portfolio: 'Portfel',
  accounts: 'Ustawienia finansów',
  flows: 'Przepływy',
};

const WIDTH_BY_TAB: Record<FinanceTabKey, 'narrow' | 'default' | 'wide'> = {
  dashboard: 'default',
  portfolio: 'default',
  accounts: 'default',
  flows: 'wide',
};

function FinancePage() {
  const userId = useStore((s) => s.session?.user?.id);
  const goToday = useNavigate();
  const { bundleQuery, bankLoading, quotesSettled, bankError, notice, refetchBank, valuedHoldings, portfolio, data, metrics } = useFinancePageData(userId);
  const mutations = useFinanceMutations(userId);
  const holdingMutations = useHoldingMutations(userId);
  const cashEntry = useCashEntryMutation(userId);
  // Powrót z banku (?bank=connected|denied) otwiera ustawienia, gdzie karta Bank obsługuje wynik.
  const [tab, setTab] = useState<FinanceTabKey>(() => (new URLSearchParams(window.location.search).has('bank') ? 'accounts' : 'dashboard'));
  const [returnTab, setReturnTab] = useState<Exclude<FinanceTabKey, 'accounts'>>('dashboard');
  const [quickEntry, setQuickEntry] = useState<{ open: boolean; kind: 'expense' | 'income' }>({ open: false, kind: 'expense' });
  const reduceMotion = useReducedMotion();
  const navigate = (next: FinanceTabKey) => {
    if (next === 'accounts' && tab !== 'accounts') setReturnTab(tab);
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd zapisu', 'error');
    }
  };

  const saveCashEntry = async (input: CashEntryInput) => {
    try {
      await cashEntry.mutateAsync(input);
      return true;
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd zapisu', 'error');
      return false;
    }
  };

  const currentMonth = `${getTodayWarsaw().slice(0, 7)}-01`;
  const storedSnapshot = data?.snapshots.find((item) => item.snapshot_month.startsWith(currentMonth.slice(0, 7)));
  useNetWorthSnapshotSync(
    userId,
    metrics && quotesSettled ? { netWorth: metrics.netWorth, liquid: metrics.liquid, investments: metrics.investments } : null,
    storedSnapshot ? storedSnapshot.net_worth : null,
  );

  const saveProfilePatch = (patch: Record<string, number>) => {
    void run(async () => { await mutations.upsertProfile.mutateAsync(patch); });
  };

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-text-muted">
        Zaloguj się, żeby otworzyć finanse.
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-text-primary">
      {(tab === 'dashboard' || tab === 'portfolio') && <div className="finance-glow pointer-events-none absolute inset-x-0 top-0 h-[26rem]" aria-hidden="true" />}

      <WorkspaceHeader
        title={TITLES[tab]}
        onBack={() => (tab === 'accounts' ? navigate(returnTab) : goToday('/dzis'))}
        backLabel={tab === 'accounts' ? 'Wróć do finansów' : 'Wróć do Sparky'}
        actions={(
          <Pressable type="button" onClick={() => navigate('accounts')} aria-label="Ustawienia finansów" aria-current={tab === 'accounts' ? 'page' : undefined}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-primary">
            <Settings size={18} aria-hidden="true" />
          </Pressable>
        )}
      />

      <ContentContainer width={WIDTH_BY_TAB[tab]} className="relative space-y-6 pb-32 pt-2">
        {(bundleQuery.isLoading || bankLoading) && <FinanceSkeleton />}
        {bundleQuery.error && (
          <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">
            {(bundleQuery.error as Error).message}
          </p>
        )}
        {bankError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-surface-1 px-4 py-3 text-sm text-text-secondary ring-1 ring-border-custom/25">
            <span>{bankError}</span>
            <Pressable type="button" onClick={() => void refetchBank()} className="shrink-0 font-medium text-primary">Spróbuj ponownie</Pressable>
          </div>
        )}
        {notice && <p role="status" className="rounded-2xl bg-surface-1 px-4 py-3 text-sm text-text-secondary ring-1 ring-border-custom/25">{notice}</p>}
        {data && !metrics && tab === 'accounts' && <FinanceAccountsTab accounts={data.accounts} mutations={mutations} run={run} />}
        {data && !metrics && tab === 'portfolio' && <FinancePortfolioTab holdings={valuedHoldings} totals={portfolio} mutations={holdingMutations} run={run} fundingAccounts={data.accounts} brokerCashPln={data.accounts.filter(a => a.account_type === 'broker_cash').reduce((s, a) => s + a.balance, 0)} />}
        {data && !metrics && tab === 'flows' && <div className="space-y-6">
          <FinanceBankCard mode="activity" financeAccounts={data.accounts} onManageAccounts={() => navigate('accounts')} />
          <FinanceManualHistory transactions={data.transactions.filter(tx => tx.source !== 'bank')} />
        </div>}

        {metrics && data && (
          <AnimatePresence initial={false}>
            <motion.div
              key={tab}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{ willChange: 'transform, opacity' }}
            >
              <FinanceTabContent
                tab={tab}
                data={data}
                metrics={metrics}
                holdings={valuedHoldings}
                portfolio={portfolio}
                mutations={mutations}
                holdingMutations={holdingMutations}
                run={run}
                saveProfilePatch={saveProfilePatch}
                onNavigate={navigate}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </ContentContainer>

      {data && (
        <FinanceQuickEntry
          accounts={data.accounts.filter(account => !account.bank_account_id)}
          pending={cashEntry.isPending}
          open={quickEntry.open}
          initialKind={quickEntry.kind}
          onOpenChange={(open) => setQuickEntry((current) => ({ ...current, open }))}
          onSubmit={saveCashEntry}
        />
      )}
      <FinanceBottomNav active={tab} onChange={navigate} onAdd={() => setQuickEntry({ open: true, kind: 'expense' })} />
    </div>
  );
}

export default FinancePage;
