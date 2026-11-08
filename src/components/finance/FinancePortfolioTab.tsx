import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { HoldingInput, PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { HoldingFormInput, HoldingMutations } from '../../lib/finance/holdingsApi';
import type { FinanceAccount } from '../../lib/financeApi';
import { formatCurrency, formatPln } from '../../lib/finance/formatMoney';
import { confirmDialog } from '../../lib/notify';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceEmpty, FinanceSection } from './financeUi';
import { FinanceHoldingForm } from './FinanceHoldingForm';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinancePortfolioChart } from './FinancePortfolioChart';
import { FinanceRebalanceCard } from './FinanceRebalanceCard';
import { formatWarsawDate } from '../../lib/date';

interface FinancePortfolioTabProps {
  holdings: ValuedHolding[];
  totals: PortfolioTotals;
  mutations: HoldingMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
  brokerCashPln?: number;
  fundingAccounts?: FinanceAccount[];
}

const pct = (value: number | null) => (value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`);
const tone = (value: number | null) => (value == null || value === 0 ? 'text-text-muted' : value > 0 ? 'text-success' : 'text-danger');

function Summary({ totals, brokerCashPln }: { totals: PortfolioTotals; brokerCashPln: number }) {
  return (
    <section className="space-y-4 pt-1" aria-label="Podsumowanie portfela">
      <div className="space-y-1">
        <p className="text-sm text-text-muted">Wartość portfela</p>
        <p className="text-3xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">
          {totals.unvaluedCount ? '—' : formatPln(totals.valuePln + brokerCashPln)}
        </p>
        <p className="text-sm text-text-muted">W tym wolne środki na rachunku inwestycyjnym: {formatPln(brokerCashPln, 2)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-t border-border-custom/20 pt-4">
        <div className="space-y-1">
          <dt className="text-xs text-text-muted">Zmiana wg ostatnich notowań</dt>
          <dd className={`text-lg font-semibold tabular-nums ${tone(totals.dayChangePln)}`}>{totals.unquotedCount ? '—' : formatPln(totals.dayChangePln, 2)}</dd>
          <dd className="text-xs text-text-secondary">{totals.unquotedCount ? 'Niepełne notowania' : pct(totals.dayChangePct)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-text-muted">Wynik od zakupu</dt>
          <dd className={`text-lg font-semibold tabular-nums ${totals.incompleteCostCount ? 'text-text-muted' : tone(totals.pnlPln)}`}>
            {totals.incompleteCostCount ? '—' : formatPln(totals.pnlPln, 2)}
          </dd>
          <dd className="text-xs text-text-secondary">{totals.incompleteCostCount ? 'Brakuje historycznego kosztu w PLN' : pct(totals.pnlPct)}</dd>
        </div>
      </dl>
      {totals.unquotedCount > 0 && (
        <p className="text-sm text-warning">
          Bez bieżącego notowania: {totals.unquotedCount}. Wycena ze zrzutu: {totals.snapshotCount ?? 0}; brak wyceny: {totals.unvaluedCount ?? 0}. Pozostałe mają wycenę po koszcie
          zakupu.
        </p>
      )}
    </section>
  );
}

/** Wiersz tabeli pozycji (wzorzec z aplikacji portfelowych): symbol i nazwa, cena ze zmianą dnia, wartość z wynikiem. */
function HoldingRow({ item, onOpen }: { item: ValuedHolding; onOpen: () => void }) {
  const symbol = item.ticker.replace(/[-.].*$/, '').slice(0, 3);
  const weight = item.weightPct.toFixed(1).replace('.', ',');
  return (
    <Pressable type="button" onClick={onOpen} className="block w-full px-4 py-3 text-left transition-colors hover:bg-surface-2/50">
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text-secondary">{symbol}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-text-primary">{item.ticker}</span>
          <span className="block truncate text-xs text-text-muted">{item.name} · {weight}%{item.targetWeightPct != null ? ` / cel ${item.targetWeightPct}%` : ''}</span>
        </span>
        <span className="w-24 shrink-0 text-right">
          <span className="block text-sm tabular-nums text-text-primary">{item.pricePln != null ? formatPln(item.pricePln, 2) : '—'}</span>
          <span className={`block text-xs tabular-nums ${tone(item.dayChangePct)}`}>{pct(item.dayChangePct)}</span>
        </span>
        <span className="w-24 shrink-0 text-right">
          <span className="block text-base font-medium tabular-nums text-text-primary">{item.valuationSource === 'missing' ? '—' : formatPln(item.valuePln)}</span>
          <span className={`block text-xs tabular-nums ${tone(item.pnlPct)}`}>{pct(item.pnlPct)} łącznie</span>
        </span>
      </span>
      {/* Każda informacja to osobny, niełamany kawałek: zawija się całymi frazami, nie w środku kwoty. */}
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-13 text-xs text-text-muted">
        {item.avgCostOriginal != null && (
          <span className="whitespace-nowrap">średni koszt {formatCurrency(item.avgCostOriginal, item.avgCostCurrency || 'PLN')}</span>
        )}
        {item.valuationSource === 'snapshot' && <span className="whitespace-nowrap">wycena ze zrzutu ({item.snapshotAsOf || 'data notowania niepodana'})</span>}
        {item.valuationSource === 'cost' && <span className="whitespace-nowrap">wycena po koszcie</span>}
        {item.valuationSource === 'missing' && <span className="whitespace-nowrap">brak wyceny</span>}
        <span className="whitespace-nowrap">
          {item.assetClass === 'crypto' ? 'Zmiana dzienna' : 'Ostatnia sesja'}
          {item.quoteAsOf ? ` · ${formatWarsawDate(item.quoteAsOf)}` : ' · data notowania niepodana'}
        </span>
      </span>
    </Pressable>
  );
}

export function FinancePortfolioTab({ holdings, totals, mutations, run, brokerCashPln = 0, fundingAccounts = [] }: FinancePortfolioTabProps) {
  const [editing, setEditing] = useState<HoldingInput | 'new' | null>(null);
  const close = () => setEditing(null);

  const save = async (input: HoldingFormInput) => {
    const id = editing && editing !== 'new' ? editing.id : undefined;
    let ok = false;
    await run(async () => {
      await mutations.saveHolding.mutateAsync({ ...input, id });
      ok = true;
    });
    return ok;
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    const target = editing;
    if (!(await confirmDialog(`Usunąć ${target.ticker}? Pozycja zniknie z portfela i mapy cieplnej.`))) return;
    await run(async () => {
      await mutations.removeHolding.mutateAsync(target.id);
    });
    close();
  };

  return (
    <div className="space-y-8">
      <Summary totals={totals} brokerCashPln={brokerCashPln} />

      <FinancePortfolioChart holdings={holdings} />

      <FinanceHoldingsHeatmap holdings={holdings} loading={false} />

      <FinanceSection title="Pozycje">
        {holdings.length === 0 ? (
          <FinanceEmpty>Dodaj pierwszą pozycję: symbol notowań, ilość i średnią cenę zakupu w PLN.</FinanceEmpty>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 pb-1 pt-3 text-xs text-text-muted" aria-hidden="true">
              <span className="flex-1">Pozycja</span>
              <span className="w-24 shrink-0 text-right">Cena</span>
              <span className="w-24 shrink-0 text-right">Wartość</span>
            </div>
            <ul className="divide-y divide-border-custom/20">
              {[...holdings]
                .sort((x, y) => y.valuePln - x.valuePln)
                .map((item) => (
                  <li key={item.id}>
                    <HoldingRow item={item} onOpen={() => setEditing(item)} />
                  </li>
                ))}
            </ul>
          </>
        )}
        <div className="border-t border-border-custom/20 p-3">
          <Button variant="tonal" className="w-full" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            Dodaj pozycję
          </Button>
        </div>
      </FinanceSection>

      <FinanceRebalanceCard
        holdings={holdings}
        fundingAccounts={fundingAccounts}
        pending={mutations.addPurchase.isPending}
        onBought={(holding, units, pricePln, accountId) =>
          void run(async () => {
            await mutations.addPurchase.mutateAsync({ holding, units, pricePln, accountId });
          })
        }
      />

      <Sheet
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={editing === 'new' ? 'Nowa pozycja' : 'Edytuj pozycję'}
        side="bottom"
        compact
      >
        {editing != null && (
          <FinanceHoldingForm
            key={editing === 'new' ? 'new' : editing.id}
            holding={editing === 'new' ? undefined : editing}
            pending={mutations.saveHolding.isPending}
            onSubmit={save}
            onRemove={() => void remove()}
            onDone={close}
          />
        )}
      </Sheet>
    </div>
  );
}
