import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useFinanceMutations } from '../../lib/financeApi';
import { useCashEntryMutation, type CashEntryInput } from '../../lib/finance/cashEntryApi';
import { useHoldingMutations } from '../../lib/finance/holdingsApi';
import { useNetWorthSnapshotSync } from '../../lib/finance/netWorthSnapshots';
import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import ContentContainer from '../shared/ContentContainer';
import Spinner from '../ui/Spinner';
import { FinanceTabContent, type FinanceTabKey } from './FinanceTabContent';
import { FinanceBottomNav } from './FinanceBottomNav';
import { FinanceQuickEntry } from './FinanceQuickEntry';
import { useForcedDarkTheme } from './useForcedDarkTheme';
import { useFinancePageData } from './useFinancePageData';

const TITLES: Record<FinanceTabKey, string> = {
  dashboard: 'Finanse',
  portfolio: 'Portfel',
  accounts: 'Konta',
  flows: 'Przepływy',
};

const WIDTH_BY_TAB: Record<FinanceTabKey, 'narrow' | 'default' | 'wide'> = {
  dashboard: 'default',
  portfolio: 'default',
  accounts: 'narrow',
  flows: 'wide',
};

function FinancePage() {
  const userId = useStore((s) => s.session?.user?.id);
  const { bundleQuery, holdingsQuery, quotesQuery, valuedHoldings, portfolio, data, metrics } = useFinancePageData(userId);
  const mutations = useFinanceMutations(userId);
  const holdingMutations = useHoldingMutations(userId);
  const cashEntry = useCashEntryMutation(userId);
  const [tab, setTab] = useState<FinanceTabKey>('dashboard');
  const [quickEntry, setQuickEntry] = useState<{ open: boolean; kind: 'expense' | 'income' }>({ open: false, kind: 'expense' });
  useForcedDarkTheme();
  const reduceMotion = useReducedMotion();

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
  const quotesSettled = !holdingsQuery.isLoading && !quotesQuery.isLoading;
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
      <div className="finance-glow pointer-events-none absolute inset-x-0 top-0 h-[26rem]" aria-hidden="true" />

      <header className="relative z-[var(--z-sticky)]">
        <div className="mx-auto flex max-w-[var(--content-default)] items-center gap-3 px-[var(--space-4)] py-3 md:px-[var(--space-8)]">
          <Link
            to="/dzis"
            aria-label="Wróć"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/30 text-text-primary transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)] active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold">{TITLES[tab]}</h1>
          <span className="h-10 w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <ContentContainer width={WIDTH_BY_TAB[tab]} className="relative space-y-6 pb-32 pt-2">
        {bundleQuery.isLoading && (
          <div className="flex justify-center py-16"><Spinner /></div>
        )}
        {bundleQuery.error && (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">
            {(bundleQuery.error as Error).message}
          </p>
        )}

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
                quotesLoading={quotesQuery.isFetching}
                mutations={mutations}
                holdingMutations={holdingMutations}
                run={run}
                saveProfilePatch={saveProfilePatch}
                onQuickEntry={(kind) => setQuickEntry({ open: true, kind })}
                onNavigate={setTab}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </ContentContainer>

      {data && (
        <FinanceQuickEntry
          accounts={data.accounts}
          pending={cashEntry.isPending}
          open={quickEntry.open}
          initialKind={quickEntry.kind}
          onOpenChange={(open) => setQuickEntry((current) => ({ ...current, open }))}
          showFab={tab !== 'dashboard'}
          onSubmit={saveCashEntry}
        />
      )}
      <FinanceBottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default FinancePage;
