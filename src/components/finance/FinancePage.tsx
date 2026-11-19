import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useFinanceMutations, type FinanceTransaction } from '../../lib/financeApi';
import { useBankData } from '../../lib/finance/bankApi';
import { useCashEntryMutation, type CashEntryInput } from '../../lib/finance/cashEntryApi';
import { useHoldingMutations } from '../../lib/finance/holdingsApi';
import { useNetWorthSnapshotSync } from '../../lib/finance/netWorthSnapshots';
import { notify } from '../../lib/notify';
import { getTodayWarsaw, formatWarsawDate } from '../../lib/date';
import ContentContainer from '../shared/ContentContainer';
import { FinanceSkeleton } from './FinanceSkeleton';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceTabContent, type FinanceTabKey } from './FinanceTabContent';
import { FinanceBottomNav } from './FinanceBottomNav';
import { FinanceQuickEntry } from './FinanceQuickEntry';
import { useFinancePageData } from './useFinancePageData';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { FinanceBankCard } from './FinanceBankCard';
import { FinanceReferenceHeader, FinanceReferenceTransactionSheet } from './FinanceReferenceChrome';
import { FinanceMonthPicker, FinanceReferenceTransactions } from './FinanceReferenceViews';
import FinanceReferenceStart from './FinanceReferenceStart';
import type { FinanceDateRange } from './financeReferencePeriods';
import FinanceReferenceAnalysis from './FinanceReferenceAnalysis';

const TITLES: Record<FinanceTabKey, string> = {
  dashboard: 'Twój kapitał. Twój kierunek.',
  portfolio: 'Portfel',
  accounts: 'Ustawienia finansów',
  flows: 'Transakcje',
  analysis: 'Twoje finanse w liczbach',
  tools: 'Narzędzia finansowe',
};

const WIDTH_BY_TAB: Record<FinanceTabKey, 'narrow' | 'default' | 'wide'> = {
  dashboard: 'default',
  portfolio: 'default',
  accounts: 'default',
  flows: 'wide',
  analysis: 'wide',
  tools: 'wide',
};

function FinancePage() {
  const userId = useStore((s) => s.session?.user?.id);
  const goToday = useNavigate();
  const { bundleQuery, bankLoading, historyLoading, quotesSettled, bankError, notice, refetchBank, valuedHoldings, portfolio, data, metrics } = useFinancePageData(userId);
  const mutations = useFinanceMutations(userId);
  const holdingMutations = useHoldingMutations(userId);
  const cashEntry = useCashEntryMutation(userId);
  const bank = useBankData(userId);
  const [month, setMonth] = useState(() => getTodayWarsaw().slice(0, 7));
  const [category, setCategory] = useState('');
  const [historyRange, setHistoryRange] = useState<FinanceDateRange | null>(null);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);
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

  const openQuickEntry = () => setQuickEntry({ open: true, kind: 'expense' });
  const openTransactions = (filter = '', range: FinanceDateRange | null = null) => {
    setCategory(filter);
    setHistoryRange(range);
    navigate('flows');
  };

  const historyAvailable = !historyLoading && !bankError && !data?.bankReconciliationPending;
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
    <div className="finance-reference min-h-screen">
      <FinanceReferenceHeader userId={userId} tab={tab} bankConnected={bank.data?.connection?.status === 'active'}
        onBack={() => tab === 'accounts' || tab === 'tools' ? navigate(tab === 'tools' ? 'accounts' : returnTab) : goToday('/dzis')}
        onAccounts={() => navigate('accounts')} onQuickEntry={openQuickEntry} />

      <ContentContainer width={WIDTH_BY_TAB[tab]} className="finance-reference-content relative space-y-5 pb-32 pt-2">
        <div className="finance-reference-heading">
          <p className="finance-reference-label">{tab === 'dashboard' ? 'Majątek i rozwój' : tab === 'flows' ? 'Historia' : tab === 'analysis' ? 'Analiza' : 'Finanse Sparky'}</p>
          <h1>{TITLES[tab]}</h1>
        </div>
        {(tab === 'dashboard' || (tab === 'flows' && !historyRange)) && <FinanceMonthPicker month={month} onChange={(value) => { setMonth(value); setCategory(''); }} />}
        {tab === 'flows' && historyRange && <div className="finance-reference-card flex flex-wrap items-center justify-between gap-x-3">
          <span>Okres analizy · {formatWarsawDate(historyRange.from)} – {formatWarsawDate(historyRange.to)}</span>
          <Pressable type="button" className="finance-reference-link" onClick={() => setHistoryRange(null)}>Wróć do widoku miesiąca</Pressable>
        </div>}
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
        {data && historyAvailable && tab === 'dashboard' && <FinanceReferenceStart data={data} metrics={metrics} portfolioValue={portfolio.valuePln} month={month}
          onPortfolio={() => navigate('portfolio')} onAccounts={() => navigate('accounts')} onTransactions={openTransactions} onSelect={setSelected} />}
        {data && tab === 'flows' && (
          <>
            {historyAvailable && <FinanceReferenceTransactions data={data} month={month} range={historyRange} category={category}
              onCategory={setCategory} onQuickEntry={openQuickEntry} onSelect={setSelected} />}
            {bank.data?.connection ? <details className="finance-reference-card">
              <summary>Operacje bankowe i kategoryzacja</summary>
              <FinanceBankCard mode="activity" financeAccounts={data.accounts} onManageAccounts={() => navigate('accounts')} />
            </details> : <Pressable type="button" onClick={() => navigate('accounts')} className="finance-reference-link">Przejdź do ustawień finansów</Pressable>}
          </>
        )}
        {data && historyAvailable && tab === 'analysis' && <FinanceReferenceAnalysis transactions={data.transactions} onCategory={openTransactions} />}
        {tab === 'accounts' && metrics && <Pressable type="button" className="finance-reference-link" onClick={() => navigate('tools')}>Budżet, cele i stałe płatności</Pressable>}

        {metrics && data && (tab === 'portfolio' || tab === 'accounts' || tab === 'tools') && (
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
      <FinanceReferenceTransactionSheet selected={selected} onClose={() => setSelected(null)} />
      <FinanceBottomNav active={tab} onChange={navigate} />
    </div>
  );
}

export default FinancePage;
