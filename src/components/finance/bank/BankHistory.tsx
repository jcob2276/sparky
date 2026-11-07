import type { BankTransaction } from '../../../lib/finance/bankApi';
import { formatWarsawDate } from '../../../lib/date';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { bankCategoryLabel } from '../../../lib/finance/bankSpending';
import { isBankBooked } from '../../../lib/finance/bankAnalytics';
import Button from '../../ui/Button';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from '../financeUi';

interface Props {
  transactions: BankTransaction[];
  limit: number;
  onMore: () => void;
  onEdit: (tx: BankTransaction) => void;
}
const STATUS: Record<string, string> = { PDNG: 'Oczekująca', HOLD: 'Blokada', CNCL: 'Anulowana', RJCT: 'Odrzucona', SCHD: 'Zaplanowana', OTHR: 'Nieznany status' };

export function BankHistory({ transactions, limit, onMore, onEdit }: Props) {
  return (
    <FinanceSection title="Historia transakcji" subtitle={`${transactions.length} pozycji w wybranym zakresie`}>
      {transactions.length === 0 && <FinanceEmpty>Brak transakcji dla tych filtrów.</FinanceEmpty>}
      <FinanceList>
        {transactions.slice(0, limit).map(tx => (
          <FinanceRow key={tx.id} primary={<span className="break-words">{tx.counterparty_name || tx.remittance || 'Transakcja'}</span>}
            secondary={`${tx.booking_date ? formatWarsawDate(tx.booking_date) : 'Brak daty'} · ${bankCategoryLabel(tx.category)}${tx.category_source === 'manual' ? ' · ręcznie' : ''}`}
            trailing={<span className={tx.amount > 0 ? 'text-success' : undefined}>{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}</span>}>
            {tx.remittance && !/^TRANSAKCJA KART/i.test(tx.remittance) && <p className="mt-1 break-words text-sm text-text-muted">{tx.remittance}</p>}
            {!isBankBooked(tx) && <p className="mt-1 text-sm text-text-muted">{STATUS[tx.status ?? 'OTHR'] ?? 'Nieznany status'} · poza sumami wykonania</p>}
            <Button size="sm" variant="ghost" aria-label={`Zmień kategorię: ${tx.counterparty_name || 'transakcja'}`} onClick={() => onEdit(tx)}>Zmień kategorię</Button>
          </FinanceRow>
        ))}
      </FinanceList>
      {transactions.length > limit && <div className="p-3"><Button variant="outline" className="w-full" onClick={onMore}>Pokaż kolejne transakcje</Button></div>}
    </FinanceSection>
  );
}
