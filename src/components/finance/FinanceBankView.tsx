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

interface Props extends BankConnectionPanelProps {
  mode: 'accounts' | 'activity';
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
          {!loading && !error && !accounts.length && (
            <FinanceEmpty>Połącz rachunek w Kontach, żeby zobaczyć historię i kategorie.</FinanceEmpty>
          )}
          {props.onManageAccounts && !accounts.length && (
            <Button variant="outline" onClick={props.onManageAccounts}>
              Przejdź do Kont
            </Button>
          )}
        </>
      )}
      {props.mode === 'activity' && data && accounts.length > 0 && (
        <>
          <BankFilters filters={filters} accounts={accounts} currencies={screen.currencies} onChange={update} />
          <details className="space-y-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-text-secondary">Analiza wpływów i wydatków</summary>
            <FinanceSection
              title={
                filters.month ? `Podsumowanie · ${filters.month} · ${filters.currency}` : `Cała pobrana historia · ${filters.currency}`
              }
            >
              <BankOverview report={report} currency={filters.currency} comparison={screen.comparison} />
              <BankSpendingSummary
                spending={report.spending}
                currency={filters.currency}
                onSelect={(category) => drill({ category, direction: 'expense' })}
              />
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
          </details>
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
            <p className="text-xs text-text-muted">
              Filtry dotyczą historii. Analiza uwzględnia wybrany okres, rachunek i walutę, do dziś.
            </p>
            <BankHistory transactions={screen.history} limit={screen.limit} onMore={screen.more} onEdit={screen.edit} />
          </div>
          <details className="space-y-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-text-secondary">
              Wykryte regularne płatności
            </summary>
            <FinanceSection
              title="Regularne płatności"
              subtitle="Propozycje z historii wybranego rachunku i waluty, do dziś. Plan zatwierdzonych płatności jest poniżej."
            >
              {screen.recurring.length ? (
                <BankRecurringList items={screen.recurring} currency={filters.currency} />
              ) : (
                <FinanceEmpty>Za mało regularnych powtórzeń, żeby wskazać stałe płatności.</FinanceEmpty>
              )}
            </FinanceSection>
          </details>
        </>
      )}
      {screen.editing && (
        <BankCategoryEditor
          key={screen.editing.id}
          transaction={screen.editing}
          pending={assigning}
          onClose={() => screen.edit(null)}
          onSave={onAssignCategory}
        />
      )}
    </div>
  );
}
