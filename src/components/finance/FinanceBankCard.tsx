import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useBankActions, useBankData } from '../../lib/finance/bankApi';
import { bankHealth } from '../../lib/finance/bankStatus';
import { notify } from '../../lib/notify';
import { FinanceBankView } from './FinanceBankView';
import { useFinanceBundle, type FinanceAccount } from '../../lib/financeApi';
import { useFinanceBankLink, useResolveBankEntry } from '../../lib/finance/bankLinksApi';
import { BankManualReconciliation } from './bank/BankManualReconciliation';

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
      error={query.error?.message}
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
      onConnect={() => connect.mutate(undefined, { onError: onError('Nie udało się rozpocząć połączenia z bankiem') })}
      onSync={() => { if (query.error) void query.refetch(); else sync.mutate(undefined, {
        onError: onError('Synchronizacja z bankiem nie powiodła się'), onSuccess: message => notify(message, 'info'),
      }); }}
      onAssignCategory={async input => {
        try { await assignCategory.mutateAsync(input); notify('Kategoria zapisana.', 'success'); return true; }
        catch (err: unknown) { onError('Nie udało się zapisać kategorii')(err); return false; }
      }}
    />
    {mode === 'accounts' && <BankManualReconciliation accounts={financeAccounts} manual={bundle.data?.transactions ?? []} bank={query.data?.transactions ?? []} pending={resolve.isPending}
      onResolve={(id, bankTransactionId) => resolve.mutate({ id, bankTransactionId }, { onError: onError('Nie udało się uzgodnić wpisu') })} />}
  </>);
}
