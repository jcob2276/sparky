import type { BankCategoryAssignment } from '../../lib/finance/bankApi';
import Button from '../ui/Button';
import { FinanceEmpty, FinanceSection } from './financeUi';
import { BankSpendingSummary } from './BankSpendingSummary';
import { BankRecurringList } from './BankRecurringList';
import { BankConnectionPanel, type BankConnectionPanelProps } from './bank/BankConnectionPanel';
import { BankCategoryEditor } from './bank/BankCategoryEditor';
import { BankFilters } from './bank/BankFilters';
import { BankHistory } from './bank/BankHistory';
import { BankOverview } from './bank/BankOverview';
import { BankPartyBreakdown } from './bank/BankPartyBreakdown';
import { useBankScreen } from './bank/useBankScreen';
import { getTodayWarsaw } from '../../lib/date';
import { BankSpendingOverview } from './bank/BankSpendingOverview';

interface Props extends BankConnectionPanelProps {
  mode: 'accounts' | 'activity' | 'overview';
  onOpenDetails?: () => void;
  onManageAccounts?: () => void;
  assigning: boolean;
  onAssignCategory: (input: BankCategoryAssignment) => Promise<boolean>;
}

export function FinanceBankView(props: Props) {
  const { data, loading, error, syncing, assigning, onSync, onAssignCategory } = props;
  const screen = useBankScreen(data);
  const { accounts, filters, update, report } = screen;
  const drill = (patch: Parameters<typeof update>[0]) => {
    update({
      category: '',
      direction: '',
      counterparty: '',
      search: '',
      bookedOnly: true,
      today: getTodayWarsaw(),
      ...patch,
    });
    document.getElementById('bank-history')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  if (props.mode === 'overview') return <BankSpendingOverview report={report} currency={filters.currency} month={filters.month} loading={loading} error={error} hasAccounts={accounts.length > 0} onOpenDetails={props.onOpenDetails} onManageAccounts={props.onManageAccounts} />;
  return (
    <div className="space-y-6">
      {props.mode === 'accounts' && <BankConnectionPanel {...props} />}
      {props.mode === 'activity' && (
        <>
          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
              <Button variant="outline" loading={syncing || loading} onClick={onSync}>
                Spróbuj ponownie
              </Button>
            </div>
          )}
          {loading && <FinanceEmpty>Wczytuję historię z banku…</FinanceEmpty>}
          {!loading && !error && !accounts.length && <FinanceEmpty>Połącz rachunek w ustawieniach finansów, żeby zobaczyć historię i kategorie.</FinanceEmpty>}
          {props.onManageAccounts && !accounts.length && (
            <Button variant="outline" onClick={props.onManageAccounts}>
              Przejdź do ustawień finansów
            </Button>
          )}
        </>
      )}
      {props.mode === 'activity' && data && accounts.length > 0 && (
        <>
          <BankFilters filters={filters} accounts={accounts} currencies={screen.currencies} onChange={update} />
          <FinanceSection title={filters.month ? `Bilans miesiąca · ${filters.month}` : 'Bilans pobranej historii'}>
            <BankOverview report={report} currency={filters.currency} comparison={screen.comparison} />
          </FinanceSection>
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <div className="order-1 space-y-6" id="bank-analysis">
              <FinanceSection title="Kategorie i kontrahenci">
                <BankSpendingSummary spending={report.spending} currency={filters.currency} onSelect={(category) => drill({ category, direction: 'expense' })} />
                <BankPartyBreakdown
                  title="Skąd wpływa"
                  rows={report.sources}
                  currency={filters.currency}
                  onSelect={(counterparty) => drill({ counterparty, direction: 'income' })}
                />
                <BankPartyBreakdown
                  title="Najwięksi odbiorcy wydatków"
                  rows={report.merchants}
                  currency={filters.currency}
                  onSelect={(counterparty) => drill({ counterparty, direction: 'expense' })}
                />
              </FinanceSection>
            </div>
            <div className="order-2 space-y-3">
              {report.reviewCount > 0 && (
                <Button variant="outline" className="w-full" onClick={() => drill({ category: 'do_sprawdzenia' })}>
                  Do sprawdzenia w tym okresie: {report.reviewCount}
                </Button>
              )}
              <div id="bank-history" className="scroll-mt-4 space-y-3">
                {filters.counterparty && (
                  <div className="flex items-center justify-between gap-2 text-sm text-text-muted">
                    <span>Wybrany kontrahent: {screen.history[0]?.counterparty_name || filters.counterparty}</span>
                    <Button size="sm" variant="ghost" onClick={() => update({ counterparty: '' })}>
                      Wszyscy
                    </Button>
                  </div>
                )}
                <p className="text-xs text-text-muted">Filtry dotyczą historii. Analiza uwzględnia wybrany okres, rachunek i walutę, do dziś.</p>
                <BankHistory transactions={screen.history} limit={screen.limit} onMore={screen.more} onEdit={screen.edit} />
              </div>
            </div>
          </div>
          {screen.recurring.length > 0 && (
            <FinanceSection title="Wykryte regularne płatności" subtitle="Propozycje z historii wybranego rachunku i waluty, do dziś. Plan zatwierdzonych płatności jest poniżej.">
              <BankRecurringList items={screen.recurring} currency={filters.currency} />
            </FinanceSection>
          )}
        </>
      )}
      {screen.editing && (
        <BankCategoryEditor key={screen.editing.id} transaction={screen.editing} pending={assigning} onClose={() => screen.edit(null)} onSave={onAssignCategory} />
      )}
    </div>
  );
}
