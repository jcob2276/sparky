import { useState } from 'react';
import { customBankCategoryLabel } from '@vanguard/domain';
import { useBankActions, type BankTransaction } from '../../lib/finance/bankApi';
import { isBankBooked } from '../../lib/finance/bankAnalytics';
import { bankCategoryLabel } from '../../lib/finance/bankSpending';
import { formatCurrency } from '../../lib/finance/formatMoney';
import { notify } from '../../lib/notify';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import { BankCategoryEditor } from './bank/BankCategoryEditor';

export function FinanceClassification({ userId, transactions, month }: {
  userId: string;
  transactions: BankTransaction[];
  month: string;
}) {
  const { assignCategory } = useBankActions(userId);
  const [editing, setEditing] = useState<BankTransaction | null>(null);
  const [reviewOnly, setReviewOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);
  const records = transactions.filter((tx) => isBankBooked(tx) && tx.booking_date?.startsWith(month));
  const review = records.filter((tx) => !tx.category || tx.category === 'do_sprawdzenia');
  const shown = (reviewOnly ? review : records)
    .filter((tx) => [tx.counterparty_name, tx.remittance, bankCategoryLabel(tx.category)].join(' ').toLocaleLowerCase('pl')
      .includes(search.trim().toLocaleLowerCase('pl')))
    .sort((a, b) => (b.booking_date ?? '').localeCompare(a.booking_date ?? '') || b.id.localeCompare(a.id));
  const customCategories = transactions.flatMap((tx) => tx.category && customBankCategoryLabel(tx.category) ? [tx.category] : []);

  return (
    <section className="finance-reference-card space-y-3" aria-label="Ręczna kategoryzacja">
      <h2 className="font-semibold">Ręczna kategoryzacja</h2>
      <div className="finance-reference-segment">
        <Pressable type="button" aria-pressed={reviewOnly} onClick={() => { setReviewOnly(true); setLimit(30); }}>Do sprawdzenia ({review.length})</Pressable>
        <Pressable type="button" aria-pressed={!reviewOnly} onClick={() => { setReviewOnly(false); setLimit(30); }}>Wszystkie bankowe</Pressable>
      </div>
      <div className="finance-reference-search">
        <label><ControlInput type="search" aria-label="Szukaj w kategoryzacji" placeholder="Szukaj kontrahenta lub kategorii" value={search}
          onChange={(event) => { setSearch(event.target.value); setLimit(30); }} /></label>
      </div>
      {shown.length > 0 ? <ul className="finance-reference-list">
        {shown.slice(0, limit).map((tx) => <li key={tx.id}>
          <Pressable type="button" className="finance-reference-record" onClick={() => setEditing(tx)}>
            <span className="min-w-0 flex-1 text-left">
              <strong className="block truncate">{tx.counterparty_name || tx.remittance || 'Transakcja bankowa'}</strong>
              <small className="block truncate text-text-muted">{bankCategoryLabel(tx.category)} · {tx.booking_date}</small>
            </span>
            <strong className="shrink-0 tabular-nums">{formatCurrency(tx.amount, tx.currency)}</strong>
          </Pressable>
        </li>)}
      </ul> : <p className="text-sm text-text-muted">{search.trim() ? 'Brak pasujących transakcji.'
        : reviewOnly && records.length ? 'W tym miesiącu wszystko ma kategorię.' : 'Brak transakcji bankowych w tym miesiącu.'}</p>}
      {shown.length > limit && <Pressable type="button" className="finance-reference-link" onClick={() => setLimit(limit + 30)}>Pokaż kolejne</Pressable>}
      {editing && <BankCategoryEditor key={editing.id} transaction={editing} pending={assignCategory.isPending} customCategories={customCategories}
        onClose={() => setEditing(null)} onSave={async (input) => {
          try {
            await assignCategory.mutateAsync(input);
            notify('Kategoria zaktualizowana', 'success');
            return true;
          } catch (error) {
            notify(error instanceof Error ? error.message : 'Nie udało się zapisać kategorii.', 'error');
            return false;
          }
        }} />}
    </section>
  );
}
