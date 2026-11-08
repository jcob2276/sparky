import type { BankData } from '../../../lib/finance/bankApi';
import type { FinanceAccount } from '../../../lib/financeApi';
import { needsRenewal, type BankHealth } from '../../../lib/finance/bankStatus';
import Button from '../../ui/Button';
import { FinanceEmpty, FinanceSection } from '../financeUi';
import { BankAccountList, type BankLinkProps } from './BankAccountList';

export interface BankConnectionPanelProps extends BankLinkProps {
  data: BankData | undefined;
  health: BankHealth;
  loading: boolean;
  error?: string;
  connecting: boolean;
  syncing: boolean;
  onConnect: () => void;
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

export function BankConnectionPanel(props: BankConnectionPanelProps) {
  const { data, health, loading, error, connecting, syncing, onConnect, onSync, missingAccounts = [] } = props;
  const connected = health.kind !== 'none';
  const accounts = data?.accounts ?? [];
  const dates = data?.transactions.flatMap((tx) => (tx.booking_date ? [tx.booking_date] : [])).sort() ?? [];
  return (
    <FinanceSection title={data?.connection?.aspsp_name || 'Bank'} subtitle={health.kind === 'ok' ? undefined : healthLine(health)}>
      <BankAccountList accounts={accounts} hiddenAccounts={data?.hiddenAccounts} onToggleVisibility={props.onToggleVisibility} togglingVisibility={props.togglingVisibility} financeAccounts={props.financeAccounts} linking={props.linking} onLink={props.onLink} />
      <div className="flex flex-wrap items-center gap-2 border-t border-border-custom/20 p-4">
        {(!connected || needsRenewal(health)) && !error && (
          <Button size="sm" loading={connecting} onClick={onConnect}>
            {connected ? 'Odnów połączenie' : 'Połącz Pekao'}
          </Button>
        )}
        {(connected || error) && (
          <Button size="sm" variant="outline" loading={syncing || loading} onClick={onSync}>
            {error ? 'Spróbuj ponownie' : 'Synchronizuj teraz'}
          </Button>
        )}
        <span className="text-xs text-text-muted">{health.kind === 'ok' ? healthLine(health) : 'Dostęp tylko do odczytu.'}</span>
      </div>
      {error && (
        <p role="alert" className="px-4 pb-4 text-sm text-danger">
          {error}
        </p>
      )}
      {data?.connection?.last_error && (
        <p role="alert" className="px-4 pb-4 text-sm text-danger">
          Ostatnia próba: {data.connection.last_error}
        </p>
      )}
      {data?.connection?.last_note && <p className="px-4 pb-4 text-sm text-text-muted">{data.connection.last_note}</p>}
      {loading && <FinanceEmpty>Wczytuję dane z banku…</FinanceEmpty>}
      {dates.length > 0 && (
        <p className="px-4 pb-4 text-xs text-text-muted">
          Dostępne transakcje: {dates[0]} – {dates[dates.length - 1]} · {data?.transactionCount} pozycji. Zakres importu może być niepełny.
        </p>
      )}
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
