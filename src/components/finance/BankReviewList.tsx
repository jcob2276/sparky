import { BANK_CATEGORY_LABELS, type BankCategory } from '@vanguard/domain';
import type { BankTransaction } from '../../lib/finance/bankApi';
import { formatWarsawDate } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import { ControlSelect } from '../ui/ControlPrimitives';
import { FinanceList, FinanceRow } from './financeUi';

const CHOOSABLE = (Object.keys(BANK_CATEGORY_LABELS) as BankCategory[]).filter((key) => key !== 'do_sprawdzenia');

interface BankReviewListProps {
  items: BankTransaction[];
  total: number;
  pending: boolean;
  onAssign: (transactionId: string, category: string) => void;
}

/**
 * Transakcje, których Sparky nie umie przypisać (bramki płatności, nieznane sklepy). Zostają otwarte, dopóki
 * użytkownik nie wybierze kategorii; wybór jest zapamiętywany dla kontrahenta, więc kolejne wpisy przypisują się same.
 */
export function BankReviewList({ items, total, pending, onAssign }: BankReviewListProps) {
  if (items.length === 0) return null;
  return (
    <div className="border-t border-border-custom/20">
      <div className="px-4 pb-1 pt-3">
        <p className="text-sm font-medium text-text-primary">Do sprawdzenia · {total}</p>
        <p className="text-xs text-text-muted">Wybierz kategorię, a zapamiętam ją dla tego kontrahenta.</p>
      </div>
      <FinanceList>
        {items.map((tx) => (
          <FinanceRow
            key={tx.id}
            primary={tx.counterparty_name ?? tx.remittance ?? 'Transakcja'}
            secondary={tx.booking_date ? formatWarsawDate(tx.booking_date) : ''}
            trailing={
              <div className="flex flex-col items-end gap-1.5">
                <span>{formatPln(tx.amount, 2)}</span>
                <ControlSelect
                  aria-label={`Kategoria: ${tx.counterparty_name ?? 'transakcja'}`}
                  defaultValue=""
                  disabled={pending}
                  className="text-xs"
                  onChange={(event) => { if (event.target.value) onAssign(tx.id, event.target.value); }}
                >
                  <option value="">Przypisz…</option>
                  {CHOOSABLE.map((key) => <option key={key} value={key}>{BANK_CATEGORY_LABELS[key]}</option>)}
                </ControlSelect>
              </div>
            }
          />
        ))}
      </FinanceList>
    </div>
  );
}
