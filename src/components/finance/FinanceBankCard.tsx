import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useBankActions, useBankData, type BankTransaction } from '../../lib/finance/bankApi';
import { bankHealth } from '../../lib/finance/bankStatus';
import { getTodayWarsaw } from '../../lib/date';
import { isBankBooked } from '../../lib/finance/bankAnalytics';
import { notify } from '../../lib/notify';
import { FinanceBankView } from './FinanceBankView';
import { useFinanceBundle, type FinanceAccount } from '../../lib/financeApi';
import { useFinanceBankLink, useResolveBankEntry } from '../../lib/finance/bankLinksApi';
import { BankAlerts } from './bank/BankAlerts';
import { useBankAlerts } from './bank/useBankAlerts';
import { BankEnvelopes } from './bank/BankEnvelopes';
import { useCategoryBudgets, useSetCategoryBudget } from '../../lib/finance/categoryBudgetsApi';
import { summarizeSpending } from '../../lib/finance/bankSpending';
import { BankManualReconciliation } from './bank/BankManualReconciliation';

const monthSpending = (rows: BankTransaction[]) => {
  const month = getTodayWarsaw().slice(0, 7);
  return summarizeSpending(rows.filter(tx => tx.currency === 'PLN' && tx.booking_date?.startsWith(month) && isBankBooked(tx)));
};

/** Po powrocie z banku funkcja bank-sync przekierowuje na ?bank=connected|denied. */
function readBankReturn(): 'connected' | 'denied' | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('bank');
  if (value !== 'connected' && value !== 'denied') return null;
  params.delete('bank');
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  return value;
}

export function FinanceBankCard({ financeAccounts = [], mode, onManageAccounts, onRemoveMissingAccount, onOpenDetails }: {
  financeAccounts?: FinanceAccount[];
  mode: 'accounts' | 'activity' | 'overview';
  onOpenDetails?: () => void;
  onManageAccounts?: () => void;
  onRemoveMissingAccount?: (account: FinanceAccount) => void;
}) {
  const userId = useStore((s) => s.session?.user?.id);
  const query = useBankData(userId);
  const { connect, sync, assignCategory, toggleVisibility } = useBankActions(userId);
  const link = useFinanceBankLink(userId);
  const bundle = useFinanceBundle(userId);
  const resolve = useResolveBankEntry(userId);
  const budgets = useCategoryBudgets(userId);
  const setBudget = useSetCategoryBudget(userId);
  const alerts = useBankAlerts(query.data, budgets.data ?? {});
  const { mutate: runSync } = sync;

  useEffect(() => {
    if (mode !== 'accounts') return;
    const result = readBankReturn();
    if (result === 'denied') notify('Zgoda w banku nie została udzielona.', 'error');
    if (result === 'connected') {
      notify('Bank połączony. Pobieram dane…', 'success');
      runSync();
    }
  }, [runSync, mode]);

  const onError = (message: string) => (err: unknown) => notify(err instanceof Error ? err.message : message, 'error');

  return (<>
    <FinanceBankView
      mode={mode}
      onOpenDetails={onOpenDetails}
      onManageAccounts={onManageAccounts}
      missingAccounts={query.isLoading ? [] : financeAccounts.filter(account => account.bank_account_id && !query.data?.accounts.some(bank => bank.id === account.bank_account_id))}
      onRemoveMissingAccount={onRemoveMissingAccount}
      data={query.data}
      error={query.data ? undefined : query.error?.message}
      financeAccounts={financeAccounts}
      linking={link.isPending}
      onLink={(bank, financeAccountId, unlink) => link.mutate({ bank, financeAccountId, unlink }, { onError: onError('Nie udało się powiązać konta') })}
      health={bankHealth(query.data?.connection ?? null)}
      loading={query.isLoading}
      connecting={connect.isPending}
      syncing={sync.isPending}
      assigning={assignCategory.isPending}
      togglingVisibility={toggleVisibility.isPending}
      onToggleVisibility={(account, hidden) => {
        toggleVisibility.mutate(
          { accountId: account.id, hidden },
          {
            onError: onError('Nie udało się zmienić widoczności rachunku'),
            onSuccess: () => notify(hidden ? 'Rachunek został ukryty.' : 'Rachunek został przywrócony.', 'success'),
          },
        );
      }}
      onConnect={bank => connect.mutate(bank, { onError: onError('Nie udało się rozpocząć połączenia z bankiem') })}
      onSync={() => { if (query.error) void query.refetch(); else sync.mutate(undefined, {
        onError: onError('Synchronizacja z bankiem nie powiodła się'), onSuccess: message => notify(message, 'info'),
      }); }}
      onAssignCategory={async input => {
        try { await assignCategory.mutateAsync(input); notify('Kategoria zapisana.', 'success'); return true; }
        catch (err: unknown) { onError('Nie udało się zapisać kategorii')(err); return false; }
      }}
    />
    {mode === 'overview' && query.data && query.data.accounts.length > 0 && (
      <div className="mt-6 space-y-6"><BankAlerts alerts={alerts} /><BankEnvelopes spending={monthSpending(query.data.transactions)} budgets={budgets.data ?? {}} currency="PLN"
        onSet={(category, limit) => setBudget.mutate({ category, limit }, { onError: onError('Nie udało się zapisać limitu') })} /></div>
    )}
    {mode === 'accounts' && <BankManualReconciliation accounts={financeAccounts} manual={bundle.data?.transactions ?? []} bank={query.data?.transactions ?? []} pending={resolve.isPending}
      onResolve={(id, bankTransactionId) => resolve.mutate({ id, bankTransactionId }, { onError: onError('Nie udało się uzgodnić wpisu') })} />}
  </>);
}
