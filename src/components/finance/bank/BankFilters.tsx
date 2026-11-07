import { BANK_CATEGORY_LABELS } from '@vanguard/domain';
import type { BankAccount } from '../../../lib/finance/bankApi';
import type { BankFilters as Filters } from '../../../lib/finance/bankAnalytics';
import { getTodayWarsaw } from '../../../lib/date';
import { ControlInput, ControlSelect } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';

interface Props { filters: Filters; accounts: BankAccount[]; currencies: string[]; onChange: (patch: Partial<Filters>) => void }
const controlClass = 'min-h-11 w-full min-w-0 rounded-lg bg-surface-2 px-3 text-sm';

export function BankFilters({ filters, accounts, currencies, onChange }: Props) {
  return (
    <div className="space-y-3" aria-label="Filtry transakcji">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="min-w-0 space-y-1 text-xs text-text-muted">Miesiąc
          <ControlInput type="month" aria-label="Miesiąc" max={getTodayWarsaw().slice(0, 7)} value={filters.month ?? ''} onChange={e => onChange({ month: e.target.value })} className={controlClass} />
        </label>
        <label className="min-w-0 space-y-1 text-xs text-text-muted">Rachunek
          <ControlSelect aria-label="Rachunek" value={filters.accountId ?? ''} onChange={e => onChange({ accountId: e.target.value })} className={controlClass}>
            <option value="">Wszystkie widoczne</option>
            {accounts.map(a => <option key={a.id} value={a.id}>Rachunek {a.iban ? `…${a.iban.slice(-4)}` : a.name}</option>)}
          </ControlSelect>
        </label>
        <label className="min-w-0 space-y-1 text-xs text-text-muted">Waluta
          <ControlSelect aria-label="Waluta" value={filters.currency} onChange={e => onChange({ currency: e.target.value })} className={controlClass}>
            {currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}
          </ControlSelect>
        </label>
      </div>
      <ControlInput aria-label="Szukaj transakcji" placeholder="Szukaj kontrahenta lub opisu…" value={filters.search ?? ''} onChange={e => onChange({ search: e.target.value })} className={controlClass} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ControlSelect aria-label="Kategoria" value={filters.category ?? ''} onChange={e => onChange({ category: e.target.value })} className={controlClass}>
          <option value="">Wszystkie kategorie</option>
          {Object.entries(BANK_CATEGORY_LABELS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </ControlSelect>
        <ControlSelect aria-label="Rodzaj transakcji" value={filters.direction ?? ''} onChange={e => onChange({ direction: e.target.value })} className={controlClass}>
          <option value="">Wszystkie ruchy</option><option value="credit">Wpływy na konto</option><option value="debit">Obciążenia konta</option>
          <option value="income">Przychody</option><option value="expense">Koszty życia</option>
          <option value="refund">Zwroty</option><option value="transfer">Przelewy własne</option><option value="investment">Inwestycje</option><option value="cash">Gotówka</option><option value="pending">Poza wykonaniem</option>
        </ControlSelect>
        <ControlSelect aria-label="Status transakcji" value={filters.bookedOnly ? 'booked' : 'all'} onChange={e => onChange({ bookedOnly: e.target.value === 'booked', today: e.target.value === 'booked' ? getTodayWarsaw() : undefined })} className={controlClass}>
          <option value="all">Wszystkie statusy</option><option value="booked">Zaksięgowane do dziś</option>
        </ControlSelect>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => onChange({ month: '' })}>Cała historia</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ month: getTodayWarsaw().slice(0, 7), accountId: '', category: '', direction: '', search: '', counterparty: '', bookedOnly: false, today: undefined })}>Wyczyść filtry</Button>
      </div>
    </div>
  );
}
