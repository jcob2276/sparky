import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useBankActions, useBankData } from '../../lib/finance/bankApi';
import { bankHealth } from '../../lib/finance/bankStatus';
import { notify } from '../../lib/notify';
import { FinanceBankView } from './FinanceBankView';

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

export function FinanceBankCard() {
  const userId = useStore((s) => s.session?.user?.id);
  const query = useBankData(userId);
  const { connect, sync } = useBankActions(userId);
  const { mutate: runSync } = sync;

  useEffect(() => {
    const result = readBankReturn();
    if (result === 'denied') notify('Zgoda w banku nie została udzielona.', 'error');
    if (result === 'connected') {
      notify('Bank połączony. Pobieram dane…', 'success');
      runSync();
    }
  }, [runSync]);

  const onError = (message: string) => (err: unknown) => notify(err instanceof Error ? err.message : message, 'error');

  return (
    <FinanceBankView
      data={query.data}
      health={bankHealth(query.data?.connection ?? null)}
      loading={query.isLoading}
      connecting={connect.isPending}
      syncing={sync.isPending}
      onConnect={() => connect.mutate(undefined, { onError: onError('Nie udało się rozpocząć połączenia z bankiem') })}
      onSync={() => sync.mutate(undefined, { onError: onError('Synchronizacja z bankiem nie powiodła się') })}
    />
  );
}
