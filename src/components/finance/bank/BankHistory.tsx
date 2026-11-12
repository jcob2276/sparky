import type { BankTransaction } from '../../../lib/finance/bankApi';
import { formatWarsawDate } from '../../../lib/date';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { bankCategoryLabel } from '../../../lib/finance/bankSpending';
import { isBankBooked } from '../../../lib/finance/bankAnalytics';
import Button from '../../ui/Button';
import { bankTransactionsToCsv } from '../../../lib/finance/bankCsv';
import { Pressable } from '../../ui/ControlPrimitives';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from '../financeUi';

interface Props {
  transactions: BankTransaction[];
  limit: number;
  onMore: () => void;
  onEdit: (tx: BankTransaction) => void;
}
const STATUS: Record<string, string> = { PDNG: 'Oczekująca', HOLD: 'Blokada', CNCL: 'Anulowana', RJCT: 'Odrzucona', SCHD: 'Zaplanowana', OTHR: 'Nieznany status' };

function downloadCsv(rows: BankTransaction[]) {
  const url = URL.createObjectURL(new Blob([bankTransactionsToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transakcje.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function BankHistory({ transactions, limit, onMore, onEdit }: Props) {
  return (
    <FinanceSection title="Transakcje" footer="Dotknij transakcji, żeby zmienić jej kategorię.">
      {transactions.length === 0 && <FinanceEmpty>Brak transakcji dla tych filtrów.</FinanceEmpty>}
      <FinanceList>
        {transactions.slice(0, limit).map(tx => (
          <Pressable key={tx.id} type="button" onClick={() => onEdit(tx)} aria-label={`Zmień kategorię: ${tx.counterparty_name || 'transakcja'}`} className="block w-full text-left hover:bg-text-primary/[0.04]">
            <FinanceRow primary={<span className="break-words">{tx.counterparty_name || tx.remittance || 'Transakcja'}</span>}
              secondary={`${tx.booking_date ? formatWarsawDate(tx.booking_date) : 'Brak daty'} · ${bankCategoryLabel(tx.category)}${tx.category_source === 'manual' ? ' · ręcznie' : ''}`}
              trailing={<span className={tx.amount > 0 ? 'text-success' : undefined}>{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}</span>}>
              {tx.remittance && !/^TRANSAKCJA KART/i.test(tx.remittance) && <p className="mt-1 break-words text-sm text-text-muted">{tx.remittance}</p>}
              {!isBankBooked(tx) && <p className="mt-1 text-sm text-text-muted">{STATUS[tx.status ?? 'OTHR'] ?? 'Nieznany status'} · poza sumami wykonania</p>}
            </FinanceRow>
          </Pressable>
        ))}
      </FinanceList>
      {transactions.length > 0 && <div className="border-t border-border-custom/20 p-3"><Button variant="ghost" className="w-full" onClick={() => downloadCsv(transactions)}>Eksportuj do CSV ({transactions.length})</Button></div>}
      {transactions.length > limit && <div className="p-3"><Button variant="outline" className="w-full" onClick={onMore}>Pokaż kolejne transakcje</Button></div>}
    </FinanceSection>
  );
}
