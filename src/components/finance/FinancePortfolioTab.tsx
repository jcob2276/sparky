import { FinanceHoldingHistory } from './FinanceHoldingHistory';
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { HoldingInput, PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { HoldingFormInput, HoldingMutations } from '../../lib/finance/holdingsApi';
import type { FinanceAccount } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { Money } from './FinanceMoney';
import { confirmDialog } from '../../lib/notify';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import Tabs from '../ui/Tabs';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceEmpty } from './financeUi';
import { FinanceHoldingForm } from './FinanceHoldingForm';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinanceAllocationCard } from './FinanceAllocationCard';
import { FinancePortfolioChart } from './FinancePortfolioChart';
import { FinanceRecordedPortfolio } from './FinanceRecordedPortfolio';
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

function PortfolioDetails({ label, children }: { label: string; children: ReactNode }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ios-group overflow-hidden">
      <Pressable type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left font-semibold">
        {label}<ChevronDown size={18} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
      </Pressable>
      <div id={panelId} hidden={!expanded} className="space-y-4 border-t border-border-custom/20 p-3">
        {expanded && children}
      </div>
    </div>
  );
}

function Summary({ totals, brokerCashPln }: { totals: PortfolioTotals; brokerCashPln: number }) {
  const dayKnown = !totals.unquotedCount;
  return (
    <section className="space-y-2 pt-1 text-center" aria-label="Podsumowanie portfela">
      <div className="space-y-1.5">
        <p className="text-sm text-text-secondary">Wartość portfela</p>
        <p className="ui-num text-[length:var(--finance-display-size)] font-semibold tabular-nums leading-[var(--line-height-display)] tracking-[var(--tracking-display)] text-text-primary">
          {totals.unvaluedCount ? '—' : <Money value={totals.valuePln + brokerCashPln} />}
        </p>
        <p className="flex min-h-7 justify-center">
          <span className={`rounded-full bg-text-primary/[0.06] px-3 py-1 text-sm font-medium tabular-nums ${dayKnown ? tone(totals.dayChangePln) : 'text-text-muted'}`}>
            {dayKnown ? `${formatPln(totals.dayChangePln, 2)} (${pct(totals.dayChangePct)}) wg ostatnich notowań` : 'Niepełne notowania'}
          </span>
        </p>
      </div>
      <dl className="ios-group divide-y divide-border-custom/20 text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
          <dt className="text-sm text-text-muted">{totals.incompleteCostCount ? 'Wynik od zakupu (brak kosztu w PLN)' : 'Wynik od zakupu'}</dt>
          <dd className={`text-base font-semibold tabular-nums ${totals.incompleteCostCount ? 'text-text-muted' : tone(totals.pnlPln)}`}>
            {totals.incompleteCostCount ? '—' : `${formatPln(totals.pnlPln, 2)} · ${pct(totals.pnlPct)}`}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
          <dt className="text-sm text-text-muted">Wolne środki u brokera</dt>
          <dd className="text-base font-semibold tabular-nums text-text-primary">{formatPln(brokerCashPln, 2)}</dd>
        </div>
      </dl>
      {totals.unquotedCount > 0 && (
        <p className="text-left text-sm text-warning">
          Bez bieżącego notowania: {totals.unquotedCount}. Wycena ze zrzutu: {totals.snapshotCount ?? 0}; brak wyceny: {totals.unvaluedCount ?? 0}. Pozostałe mają wycenę po koszcie
          zakupu.
        </p>
      )}
    </section>
  );
}

/**
 * Position row in two lines: the name once (ticker and weight underneath), the value with the day change on the right.
 * Quote date and valuation caveats stay in the second line, so provenance is kept without a third line of noise.
 */
function HoldingRow({ item, onOpen }: { item: ValuedHolding; onOpen: () => void }) {
  const weight = item.weightPct.toFixed(1).replace('.', ',');
  const caveat = item.valuationSource === 'snapshot' ? `wycena ze zrzutu (${item.snapshotAsOf || 'data niepodana'})`
    : item.valuationSource === 'cost' ? 'wycena po koszcie' : item.valuationSource === 'missing' ? 'brak wyceny' : null;
  return (
    <Pressable type="button" onClick={onOpen} className="block w-full px-4 py-3 text-left transition-colors hover:bg-text-primary/[0.04]">
      <span className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-base font-medium text-text-primary">{item.name}</span>
        <span className="shrink-0 text-base font-semibold tabular-nums text-text-primary">{item.valuationSource === 'missing' ? '—' : formatPln(item.valuePln)}</span>
      </span>
      <span className="mt-0.5 flex items-baseline gap-3 text-xs">
        <span className="min-w-0 flex-1 text-text-muted">
          {item.ticker} · {weight}%{item.targetWeightPct != null ? ` / cel ${item.targetWeightPct}%` : ''}
          {' · '}
          <span className="whitespace-nowrap">{item.assetClass === 'crypto' ? 'Zmiana dzienna' : 'Ostatnia sesja'}{item.quoteAsOf ? ` ${formatWarsawDate(item.quoteAsOf)}` : ' (data niepodana)'}</span>
          {caveat ? <span className="whitespace-nowrap"> · {caveat}</span> : null}
        </span>
        <span className={`shrink-0 tabular-nums ${tone(item.dayChangePct)}`}>{pct(item.dayChangePct)}</span>
      </span>
    </Pressable>
  );
}

export function FinancePortfolioTab({ holdings, totals, mutations, run, brokerCashPln = 0, fundingAccounts = [] }: FinancePortfolioTabProps) {
  const [editing, setEditing] = useState<HoldingInput | 'new' | null>(null);
  const [view, setView] = useState<'list' | 'map'>('map');
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
    <div className="space-y-5">
      <Summary totals={totals} brokerCashPln={brokerCashPln} />

      <section aria-label="Pozycje">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="ios-section-title">Pozycje</h2>
          <Button variant="ghost" icon={<Plus size={16} />} onClick={() => setEditing('new')}>Dodaj pozycję</Button>
        </header>
        <div className="mb-3">
          <Tabs tabs={[{ key: 'map', label: 'Mapa' }, { key: 'list', label: 'Lista' }]} active={view} onChange={(key) => setView(key as 'list' | 'map')} className="w-full" />
        </div>
        {view === 'map' ? <FinanceHoldingsHeatmap holdings={holdings} loading={false} bare /> : (
          <div className="ios-group">
            {holdings.length === 0 ? (
              <FinanceEmpty>Dodaj pierwszą pozycję: symbol notowań, ilość i średnią cenę zakupu w PLN.</FinanceEmpty>
            ) : (
              <ul className="divide-y divide-border-custom/20">
                {[...holdings]
                  .sort((x, y) => y.valuePln - x.valuePln)
                  .map((item) => (
                    <li key={item.id}>
                      <HoldingRow item={item} onOpen={() => setEditing(item)} />
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="space-y-2" aria-label="Szczegóły portfela">
        <PortfolioDetails label="Historia portfela">
          <FinanceRecordedPortfolio holdings={holdings} />
          <PortfolioDetails label="Operacje portfela"><FinanceHoldingHistory /></PortfolioDetails>
          <PortfolioDetails label="Symulacja obecnego składu"><FinancePortfolioChart holdings={holdings} /></PortfolioDetails>
        </PortfolioDetails>
        <PortfolioDetails label="Struktura majątku">
          <FinanceAllocationCard accounts={fundingAccounts ?? []} holdings={holdings} />
        </PortfolioDetails>
        <PortfolioDetails label="Kalkulator dopłaty">
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
        </PortfolioDetails>
      </div>

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
