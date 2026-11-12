import { useState } from 'react';
import type { BankChoice, BankData } from '../../../lib/finance/bankApi';
import type { FinanceAccount } from '../../../lib/financeApi';
import { needsRenewal, type BankHealth } from '../../../lib/finance/bankStatus';
import Button from '../../ui/Button';
import { FinanceEmpty, FinanceSection } from '../financeUi';
import { BankPicker } from './BankPicker';
import { BankAccountList, type BankLinkProps } from './BankAccountList';

export interface BankConnectionPanelProps extends BankLinkProps {
  data: BankData | undefined;
  health: BankHealth;
  loading: boolean;
  error?: string;
  connecting: boolean;
  syncing: boolean;
  onConnect: (bank?: BankChoice) => void;
  onSync: () => void;
  missingAccounts?: FinanceAccount[];
  onRemoveMissingAccount?: (account: FinanceAccount) => void;
}

function healthLine(health: BankHealth): string {
  switch (health.kind) {
    case 'none':
      return 'Połącz Pekao, żeby pobierać salda i historię. Dostęp tylko do odczytu.';
    case 'ok':
      return health.daysLeft != null ? `Zgoda ważna jeszcze ${health.daysLeft} dni.` : 'Zgoda aktywna.';
    case 'expiring':
      return `Zgoda wygasa za ${health.daysLeft} dni. Odnów połączenie w PeoPay.`;
    case 'expired':
      return 'Zgoda wygasła. Odnów połączenie w PeoPay.';
    case 'failed':
      return 'Połączenie nie powiodło się. Spróbuj ponownie.';
  }
}

function statusTitle(health: BankHealth): string {
  switch (health.kind) {
    case 'none': return 'Nie połączono';
    case 'ok': return 'Połączono';
    case 'expiring': return 'Zgoda wygasa wkrótce';
    case 'expired': return 'Zgoda wygasła';
    case 'failed': return 'Połączenie nie powiodło się';
  }
}

/**
 * Settings-style bank group: one status row with its single action, the accounts, then gray footnotes.
 * The consent state is said once; a failed read is a calm line with a retry, not a red alert.
 */
export function BankConnectionPanel(props: BankConnectionPanelProps) {
  const [picking, setPicking] = useState(false);
  const { data, health, loading, error, connecting, syncing, onConnect, onSync, missingAccounts = [] } = props;
  const connected = health.kind !== 'none';
  const accounts = data?.accounts ?? [];
  const dates = data?.transactions.flatMap((tx) => (tx.booking_date ? [tx.booking_date] : [])).sort() ?? [];
  const footer = (
    <>
      <p>Dostęp tylko do odczytu.</p>
      {dates.length > 0 && <p>Dostępne transakcje: {dates[0]} – {dates[dates.length - 1]} · {data?.transactionCount} pozycji. Zakres importu może być niepełny.</p>}
      {data?.connection?.last_note && <p>{data.connection.last_note}</p>}
      {data?.connection?.last_error && <p>Ostatnia próba: {data.connection.last_error}</p>}
    </>
  );
  return (
    <FinanceSection title={data?.connection?.aspsp_name || 'Bank'} footer={footer}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-text-primary">{statusTitle(health)}</p>
          <p role={error ? 'alert' : undefined} className="text-sm text-text-muted">{error || healthLine(health)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(!connected || needsRenewal(health)) && !error && (
            <Button size="sm" loading={connecting} onClick={() => onConnect()}>
              {connected ? 'Odnów' : 'Połącz Pekao'}
            </Button>
          )}
          {(connected || error) && (
            <Button size="sm" variant="outline" loading={syncing || loading} onClick={onSync}>
              {error ? 'Spróbuj ponownie' : 'Synchronizuj'}
            </Button>
          )}
        </div>
      </div>
      {connected && !error && (
        <div className="border-t border-border-custom/20 p-3">
          <Button variant="ghost" className="w-full" loading={connecting} onClick={() => setPicking(true)}>Dodaj kolejny bank</Button>
        </div>
      )}
      {picking && <BankPicker open onOpenChange={setPicking} onPick={onConnect} />}
      {loading && <FinanceEmpty>Wczytuję dane z banku…</FinanceEmpty>}
      {accounts.length > 0 && <div className="border-t border-border-custom/20" />}
      <BankAccountList accounts={accounts} hiddenAccounts={data?.hiddenAccounts} onToggleVisibility={props.onToggleVisibility} togglingVisibility={props.togglingVisibility} financeAccounts={props.financeAccounts} linking={props.linking} onLink={props.onLink} />
      {data && connected && !accounts.length && <FinanceEmpty>Nie ma widocznych rachunków. Sprawdź zgodę i połączenie z bankiem.</FinanceEmpty>}
      {missingAccounts.map((account) => (
        <div key={account.id} className="space-y-2 border-t border-border-custom/20 p-4">
          <p className="text-sm font-medium">{account.name}</p>
          <p className="text-sm text-text-muted">Źródło bankowe jest niedostępne lub ukryte. Ponów odczyt albo usuń to konto z podsumowania Finansów.</p>
          {props.onRemoveMissingAccount && (
            <Button variant="ghost" size="sm" onClick={() => props.onRemoveMissingAccount?.(account)}>
              Usuń konto z Finansów
            </Button>
          )}
        </div>
      ))}
    </FinanceSection>
  );
}
