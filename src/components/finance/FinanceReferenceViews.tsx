import { ControlInput, ControlSelect, Pressable } from '../ui/ControlPrimitives';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getTodayWarsaw } from '../../lib/date';
import type { FinanceAccount, FinanceBundle, FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { financeTransactionCategory, summarizeFinanceCategories } from './financeReferenceCategories';
import { FinanceDonut } from './FinanceDonut';
import { formatMonthLabel } from './financeNarrative';
import { financePeriodTotals, financeRecordsInRange, moveFinanceMonth, movement, type FinanceDateRange } from './financeReferencePeriods';

export function FinanceMonthPicker({ month, onChange }: { month: string; onChange: (value: string) => void }) {
  const latest = getTodayWarsaw().slice(0, 7);
  return (
    <div className="finance-reference-period">
      <Pressable type="button" aria-label="Poprzedni miesiąc" onClick={() => onChange(moveFinanceMonth(month, -1))}><ChevronLeft size={17} /></Pressable>
      <b className="capitalize">{formatMonthLabel(month)}</b>
      <Pressable type="button" aria-label="Następny miesiąc" disabled={month >= latest} onClick={() => onChange(moveFinanceMonth(month, 1))}><ChevronRight size={17} /></Pressable>
    </div>
  );
}

export function FinanceReferenceCategories({ transactions, onCategory }: {
  transactions: FinanceTransaction[];
  onCategory: (category: string) => void;
}) {
  const groups = summarizeFinanceCategories(transactions);
  const expenses = groups.reduce((sum, group) => sum + group.amount, 0);
  const slices = groups.map(({ group, amount }) => ({
    key: group, label: group, amount, value: `${formatPln(amount, 2)} · ${Math.round(amount / expenses * 100)}%`,
  }));
  return (
    <section className="finance-reference-card">
      <h2 className="finance-reference-label">Kategorie</h2>
      {slices.length ? <FinanceDonut slices={slices} ariaLabel="Wydatki według kategorii" centerLabel="Wydatki" center={formatPln(expenses, 2)} onSelect={onCategory} />
        : <p className="text-text-muted">Brak wydatków w tym okresie.</p>}
      {groups.length > 0 && <details className="mt-3">
        <summary className="finance-reference-link cursor-pointer">Podkategorie</summary>
        {groups.map(({ group, details }) => <div key={group} className="mt-3">
          <h3 className="finance-reference-label">{group}</h3>
          <dl className="finance-reference-breakdown">
            {details.map(({ detail, amount }) => <div key={detail}><dt>{detail}</dt><dd>{formatPln(amount, 2)}</dd></div>)}
          </dl>
        </div>)}
      </details>}
    </section>
  );
}

const dayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' });

export function FinanceReferenceHistory({ records, accounts, onSelect }: {
  records: FinanceTransaction[];
  accounts: FinanceAccount[];
  onSelect: (record: FinanceTransaction) => void;
}) {
  const days = new Map<string, FinanceTransaction[]>();
  for (const tx of records) {
    const group = days.get(tx.transaction_date) ?? [];
    group.push(tx);
    days.set(tx.transaction_date, group);
  }
  return (
    <div className="space-y-4">
      {[...days.entries()].map(([day, items]) => (
        <section key={day} aria-label={dayFormatter.format(new Date(`${day}T12:00:00Z`))}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 className="finance-reference-label">{dayFormatter.format(new Date(`${day}T12:00:00Z`))}</h3>
            <span className="text-sm tabular-nums text-text-muted">{formatPln(financePeriodTotals(items).balance, 2)}</span>
          </div>
          <ul className="finance-reference-list">
            {items.map((tx) => {
              const outgoing = movement(tx) === 'expense';
              const Icon = outgoing ? ArrowUpRight : ArrowDownLeft;
              const account = accounts.find((item) => item.id === tx.account_id)?.name;
              return (
                <li key={tx.id}>
                  <Pressable type="button" className="finance-reference-record" onClick={() => onSelect(tx)}>
                    <span className="finance-reference-record-icon"><Icon size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 text-left">
                      <strong className="block truncate">{tx.note || tx.category}</strong>
                      <small className="block truncate text-text-muted">{[tx.category, account, tx.source === 'bank' ? 'Bank' : 'Wpis ręczny'].filter(Boolean).join(' · ')}</small>
                    </span>
                    <strong className={outgoing ? 'shrink-0 tabular-nums' : 'finance-reference-positive shrink-0 tabular-nums'}>{outgoing ? '−' : '+'}{formatPln(Math.abs(tx.amount), 2)}</strong>
                  </Pressable>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function FinanceReferenceTransactions({ data, month, range, category, onCategory, onQuickEntry, onSelect }: {
  data: FinanceBundle;
  month: string;
  range: FinanceDateRange | null;
  category: string;
  onCategory: (value: string) => void;
  onQuickEntry: () => void;
  onSelect: (record: FinanceTransaction) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [detail, setDetail] = useState('');
  const [account, setAccount] = useState('');
  const [limit, setLimit] = useState(50);
  const [view, setView] = useState<'list' | 'categories'>('list');
  const records = range ? financeRecordsInRange(data.transactions, range)
    : data.transactions.filter((tx) => tx.transaction_date.startsWith(month));
  const hasFilters = Boolean(query || kind || account || category || detail);
  const resetFilters = () => {
    setQuery('');
    setKind('');
    setAccount('');
    setDetail('');
    onCategory('');
    setLimit(50);
  };
  const categoryOptions = [...new Set([...records.map((tx) => financeTransactionCategory(tx).group), ...(category ? [category] : [])])].sort((a, b) => a.localeCompare(b, 'pl'));
  const details = [...new Set(records.map((tx) => financeTransactionCategory(tx)).filter((item) => item.group === category).map((item) => item.detail))]
    .sort((a, b) => a.localeCompare(b, 'pl'));
  const filtered = records.filter((tx) => {
    const text = `${tx.note ?? ''} ${tx.category} ${tx.amount} ${formatPln(Math.abs(tx.amount), 2)}`.toLocaleLowerCase('pl');
    const classified = financeTransactionCategory(tx);
    return (!category || category === classified.group) && (!detail || detail === classified.detail) && (!kind || kind === movement(tx))
      && (!account || account === tx.account_id) && text.includes(query.trim().toLocaleLowerCase('pl'));
  });
  return (
    <div className="space-y-4">
      <div className="finance-reference-segment" aria-label="Widok historii">
        <Pressable type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Lista</Pressable>
        <Pressable type="button" aria-pressed={view === 'categories'} onClick={() => setView('categories')}>Kategorie</Pressable>
      </div>
      {view === 'categories' ? <FinanceReferenceCategories transactions={records} onCategory={(name) => { setDetail(''); onCategory(name); setView('list'); }} /> : (
        <>
          <div className="finance-reference-search">
            <label><Search size={16} aria-hidden="true" /><ControlInput type="search" aria-label="Szukaj transakcji" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sklep, opis lub kwota" /></label>
            <Pressable type="button" onClick={onQuickEntry}>+ Wpis ręczny</Pressable>
          </div>
          <div className="finance-reference-filters">
            <ControlSelect aria-label="Rodzaj transakcji" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="">Wszystkie rodzaje</option><option value="expense">Wydatki</option><option value="income">Wpływy</option><option value="refund">Zwroty</option>
            </ControlSelect>
            <ControlSelect aria-label="Konto transakcji" value={account} onChange={(event) => setAccount(event.target.value)}>
              <option value="">Wszystkie konta</option>{data.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </ControlSelect>
            <ControlSelect aria-label="Kategoria transakcji" value={category} onChange={(event) => { setDetail(''); onCategory(event.target.value); }}>
              <option value="">Wszystkie kategorie</option>{categoryOptions.map((value) => <option key={value}>{value}</option>)}
            </ControlSelect>
            {!!category && details.length > 0 && <ControlSelect aria-label="Podkategoria transakcji" value={detail} onChange={(event) => setDetail(event.target.value)}>
              <option value="">Wszystkie podkategorie</option>{details.map((value) => <option key={value}>{value}</option>)}
            </ControlSelect>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <p className="text-sm text-text-muted" role="status">Liczba transakcji: {filtered.length}</p>
            {hasFilters && <Pressable type="button" className="finance-reference-link" onClick={resetFilters}>Wyczyść filtry</Pressable>}
          </div>
          {filtered.length ? <FinanceReferenceHistory records={filtered.slice(0, limit)} accounts={data.accounts} onSelect={onSelect} />
            : <p className="finance-reference-card">Brak pasujących transakcji.</p>}
          {filtered.length > limit && <Pressable type="button" className="finance-reference-link" onClick={() => setLimit(limit + 50)}>Pokaż kolejne</Pressable>}
        </>
      )}
    </div>
  );
}
