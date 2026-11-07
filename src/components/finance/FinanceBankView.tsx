import type { BankAccount, BankData, BankTransaction } from '../../lib/finance/bankApi';
import { needsRenewal, type BankHealth } from '../../lib/finance/bankStatus';
import { formatWarsawDate } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import Button from '../ui/Button';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

interface FinanceBankViewProps {
  data: BankData | undefined;
  health: BankHealth;
  loading: boolean;
  connecting: boolean;
  syncing: boolean;
  onConnect: () => void;
  onSync: () => void;
}

function healthLine(health: BankHealth): string {
  switch (health.kind) {
    case 'none': return 'Połącz Pekao, a Sparky sam pobierze salda i transakcje. Dostęp tylko do odczytu.';
    case 'ok': return health.daysLeft != null ? `Zgoda ważna jeszcze ${health.daysLeft} dni.` : 'Zgoda aktywna.';
    case 'expiring': return `Zgoda wygasa za ${health.daysLeft} dni. Odnów ją w PeoPay, żeby synchronizacja się nie zatrzymała.`;
    case 'expired': return 'Zgoda wygasła, synchronizacja stoi. Odnów połączenie w PeoPay.';
    case 'failed': return 'Ostatnie połączenie z bankiem się nie udało. Spróbuj ponownie.';
  }
}

function ibanTail(account: BankAccount): string {
  return account.iban ? `…${account.iban.slice(-4)}` : '';
}

function AccountRows({ accounts }: { accounts: BankAccount[] }) {
  return (
    <FinanceList>
      {accounts.map((account) => (
        <FinanceRow
          key={account.id}
          primary={account.name ?? 'Rachunek'}
          secondary={`${ibanTail(account)}${account.balance_synced_at ? ` · stan z ${formatWarsawDate(account.balance_synced_at)}` : ''}`}
          trailing={account.balance == null ? '–' : formatPln(account.balance, 2)}
        />
      ))}
    </FinanceList>
  );
}

function TransactionRow({ tx }: { tx: BankTransaction }) {
  const credit = tx.amount > 0;
  return (
    <FinanceRow
      primary={tx.counterparty_name ?? tx.remittance ?? 'Transakcja'}
      secondary={`${tx.booking_date ? formatWarsawDate(tx.booking_date) : ''}${tx.counterparty_name && tx.remittance ? ` · ${tx.remittance}` : ''}`}
      trailing={<span className={credit ? 'text-success' : undefined}>{`${credit ? '+' : ''}${formatPln(tx.amount, 2)}`}</span>}
    />
  );
}

export function FinanceBankView({ data, health, loading, connecting, syncing, onConnect, onSync }: FinanceBankViewProps) {
  const renew = needsRenewal(health);
  const connected = health.kind !== 'none';
  const lastSync = data?.connection?.last_synced_at;

  return (
    <FinanceSection title="Bank" subtitle={healthLine(health)}>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-1">
        {(renew || !connected) && (
          <Button size="sm" onClick={onConnect} loading={connecting} className="rounded-lg">
            {connected ? 'Odnów połączenie' : 'Połącz Pekao'}
          </Button>
        )}
        {connected && (
          <Button size="sm" variant="outline" onClick={onSync} loading={syncing} className="rounded-lg">
            Synchronizuj teraz
          </Button>
        )}
        {lastSync && <span className="text-xs text-text-muted">Ostatnio: {formatWarsawDate(lastSync)}</span>}
      </div>
      {data?.connection?.last_error && connected && (
        <p className="px-4 pb-3 text-xs text-danger">Ostatni błąd: {data.connection.last_error}</p>
      )}
      {loading && <FinanceEmpty>Wczytuję dane z banku…</FinanceEmpty>}
      {data && data.accounts.length > 0 && <AccountRows accounts={data.accounts} />}
      {data && data.transactions.length > 0 && (
        <>
          <p className="border-t border-border-custom/20 px-4 pb-1 pt-3 text-xs text-text-muted">
            Ostatnie transakcje · w bazie {data.transactionCount}
          </p>
          <FinanceList>
            {data.transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
          </FinanceList>
        </>
      )}
      {data && connected && data.transactions.length === 0 && (
        <FinanceEmpty>Połączone, ale transakcji jeszcze nie pobrano. Kliknij „Synchronizuj teraz”.</FinanceEmpty>
      )}
    </FinanceSection>
  );
}
