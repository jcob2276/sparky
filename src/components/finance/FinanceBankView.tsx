import type { BankCategoryAssignment, BankData } from '../../lib/finance/bankApi';
import { needsRenewal, type BankHealth } from '../../lib/finance/bankStatus';
import Button from '../ui/Button';
import { FinanceEmpty, FinanceSection } from './financeUi';
import { BankSpendingSummary } from './BankSpendingSummary';
import { BankRecurringList } from './BankRecurringList';
import { BankAccountList, type BankLinkProps } from './bank/BankAccountList';
import { BankCategoryEditor } from './bank/BankCategoryEditor';
import { BankFilters } from './bank/BankFilters';
import { BankHistory } from './bank/BankHistory';
import { BankOverview } from './bank/BankOverview';
import { BankPartyBreakdown } from './bank/BankPartyBreakdown';
import { useBankScreen } from './bank/useBankScreen';
import { getTodayWarsaw } from '../../lib/date';

interface Props extends BankLinkProps {
  data: BankData | undefined; health: BankHealth; loading: boolean; error?: string;
  connecting: boolean; syncing: boolean; assigning: boolean;
  onConnect: () => void; onSync: () => void;
  onAssignCategory: (input: BankCategoryAssignment) => Promise<boolean>;
}

function healthLine(health: BankHealth): string {
  switch (health.kind) {
    case 'none': return 'Połącz Pekao, żeby pobierać salda i historię. Dostęp tylko do odczytu.';
    case 'ok': return health.daysLeft != null ? `Zgoda ważna jeszcze ${health.daysLeft} dni.` : 'Zgoda aktywna.';
    case 'expiring': return `Zgoda wygasa za ${health.daysLeft} dni. Odnów połączenie w PeoPay.`;
    case 'expired': return 'Zgoda wygasła. Odnów połączenie w PeoPay.';
    case 'failed': return 'Połączenie nie powiodło się. Spróbuj ponownie.';
  }
}

export function FinanceBankView(props: Props) {
  const { data, health, loading, error, connecting, syncing, assigning, onConnect, onSync, onAssignCategory } = props;
  const screen = useBankScreen(data);
  const { accounts, filters, update, report } = screen;
  const connected = health.kind !== 'none';
  const dates = data?.transactions.flatMap(tx => tx.booking_date ? [tx.booking_date] : []).sort() ?? [];
  const drill = (patch: Parameters<typeof update>[0]) => {
    update({ category: '', direction: '', counterparty: '', search: '', bookedOnly: true, today: getTodayWarsaw(), ...patch });
    document.getElementById('bank-history')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  return (
    <div className="space-y-6">
      <FinanceSection title={data?.connection?.aspsp_name || 'Bank'} subtitle={healthLine(health)}>
        <div className="flex flex-wrap items-center gap-2 p-4">
          {(!connected || needsRenewal(health)) && !error && <Button size="sm" loading={connecting} onClick={onConnect}>{connected ? 'Odnów połączenie' : 'Połącz Pekao'}</Button>}
          {(connected || error) && <Button size="sm" variant="outline" loading={syncing || loading} onClick={onSync}>{error ? 'Spróbuj ponownie' : 'Synchronizuj teraz'}</Button>}
          <span className="text-xs text-text-muted">Automatycznie kilka razy dziennie, w granicach limitów banku.</span>
        </div>
        {error && <p role="alert" className="px-4 pb-4 text-sm text-danger">{error}</p>}
        {data?.connection?.last_error && <p role="alert" className="px-4 pb-4 text-sm text-danger">Ostatnia próba: {data.connection.last_error}</p>}
        {data?.connection?.last_note && <p className="px-4 pb-4 text-sm text-text-muted">{data.connection.last_note}</p>}
        {loading && <FinanceEmpty>Wczytuję dane z banku…</FinanceEmpty>}
        <BankAccountList accounts={accounts} financeAccounts={props.financeAccounts} linking={props.linking} onLink={props.onLink} />
        {dates.length > 0 && <p className="px-4 pb-4 text-xs text-text-muted">Dostępne transakcje: {dates[0]} – {dates[dates.length - 1]} · {data?.transactionCount} pozycji. Zakres importu może być niepełny.</p>}
        {data && connected && !accounts.length && <FinanceEmpty>Nie ma widocznych rachunków. Sprawdź zgodę i połączenie z bankiem.</FinanceEmpty>}
      </FinanceSection>
      {data && accounts.length > 0 && <>
        <BankFilters filters={filters} accounts={accounts} currencies={screen.currencies} onChange={update} />
        <FinanceSection title={filters.month ? `Podsumowanie · ${filters.month} · ${filters.currency}` : `Cała pobrana historia · ${filters.currency}`}>
          <BankOverview report={report} currency={filters.currency} comparison={screen.comparison} />
          <BankSpendingSummary spending={report.spending} currency={filters.currency} onSelect={category => drill({ category, direction: 'expense' })} />
          <BankPartyBreakdown title="Skąd wpływa" rows={report.sources} currency={filters.currency} onSelect={counterparty => drill({ counterparty, direction: 'income' })} />
          <BankPartyBreakdown title="Najwięksi odbiorcy wydatków" rows={report.merchants} currency={filters.currency} onSelect={counterparty => drill({ counterparty, direction: 'expense' })} />
        </FinanceSection>
        {report.reviewCount > 0 && <Button variant="outline" className="w-full" onClick={() => drill({ category: 'do_sprawdzenia' })}>Do sprawdzenia w tym okresie: {report.reviewCount}</Button>}
        <div id="bank-history" className="scroll-mt-4 space-y-3">
          {filters.counterparty && <div className="flex items-center justify-between gap-2 text-sm text-text-muted"><span>Wybrany kontrahent: {screen.history[0]?.counterparty_name || filters.counterparty}</span><Button size="sm" variant="ghost" onClick={() => update({ counterparty: '' })}>Wszyscy</Button></div>}
          <p className="text-xs text-text-muted">Kategorie, wyszukiwanie i rodzaj ruchu filtrują historię poniżej. Sumy powyżej dotyczą wybranego okresu, rachunku i waluty, do dziś.</p>
          <BankHistory transactions={screen.history} limit={screen.limit} onMore={screen.more} onEdit={screen.edit} />
        </div>
        <FinanceSection title="Regularne płatności" subtitle="Wykryte w historii wybranego rachunku i waluty, do dziś.">
          {screen.recurring.length ? <BankRecurringList items={screen.recurring} currency={filters.currency} /> : <FinanceEmpty>Za mało regularnych powtórzeń, żeby wskazać stałe płatności.</FinanceEmpty>}
        </FinanceSection>
      </>}
      {screen.editing && <BankCategoryEditor key={screen.editing.id} transaction={screen.editing} pending={assigning} onClose={() => screen.edit(null)} onSave={onAssignCategory} />}
    </div>
  );
}
