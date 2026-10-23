import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useFinanceMutations } from '../../lib/financeApi';
import { useCashEntryMutation, type CashEntryInput } from '../../lib/finance/cashEntryApi';
import { useHoldingMutations } from '../../lib/finance/holdingsApi';
import { useNetWorthSnapshotSync } from '../../lib/finance/netWorthSnapshots';
import { notify } from '../../lib/notify';
import { getTodayWarsaw } from '../../lib/date';
import ContentContainer from '../shared/ContentContainer';
import { FinanceSkeleton } from './FinanceSkeleton';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceTabContent, type FinanceTabKey } from './FinanceTabContent';
import { FinanceBottomNav } from './FinanceBottomNav';
import { FinanceQuickEntry } from './FinanceQuickEntry';
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
  const initial = (useStore((s) => s.session?.user?.email) ?? 'S').charAt(0).toUpperCase();
  const { bundleQuery, holdingsQuery, quotesQuery, valuedHoldings, portfolio, data, metrics } = useFinancePageData(userId);
  const mutations = useFinanceMutations(userId);
  const holdingMutations = useHoldingMutations(userId);
  const cashEntry = useCashEntryMutation(userId);
  const [tab, setTab] = useState<FinanceTabKey>('dashboard');
  const [quickEntry, setQuickEntry] = useState<{ open: boolean; kind: 'expense' | 'income' }>({ open: false, kind: 'expense' });
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
        <div className="mx-auto flex max-w-[var(--content-default)] items-center gap-3 px-[var(--space-4)] pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-[var(--space-8)]">
          <Link
            to="/dzis"
            aria-label="Wróć do Sparky"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/40 text-sm font-bold text-text-primary ring-1 ring-text-primary/15 transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)] active:scale-95"
          >
            {initial}
          </Link>
          <h1 className="flex-1 text-center text-base font-semibold">{TITLES[tab]}</h1>
          <Pressable
            type="button"
            onClick={() => setTab('portfolio')}
            aria-label="Portfel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/40 text-text-primary ring-1 ring-text-primary/15"
          >
            <BarChart3 size={18} aria-hidden="true" />
          </Pressable>
        </div>
      </header>

      <ContentContainer width={WIDTH_BY_TAB[tab]} className="relative space-y-6 pb-32 pt-2">
        {bundleQuery.isLoading && (
          <FinanceSkeleton />
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
