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
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';
import { FinanceHoldingForm } from './FinanceHoldingForm';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
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

      <FinanceHoldingsHeatmap holdings={holdings} loading={false} />

      <FinanceSection title="Pozycje">
        {holdings.length === 0 ? (
          <FinanceEmpty>Dodaj pierwszą pozycję: symbol notowań, ilość i średnią cenę zakupu w PLN.</FinanceEmpty>
        ) : (
          <FinanceList>
            {[...holdings]
              .sort((a, b) => b.valuePln - a.valuePln)
              .map((item) => (
                <Pressable key={item.id} type="button" onClick={() => setEditing(item)} className="block w-full text-left transition-colors hover:bg-surface-2/50">
                  <FinanceRow
                    primary={item.ticker}
                    secondary={`${item.name} · ${item.weightPct.toFixed(1).replace('.', ',')}%${item.targetWeightPct != null ? ` / cel ${item.targetWeightPct}%` : ''}${item.avgCostOriginal != null ? ` · średni koszt ${formatCurrency(item.avgCostOriginal, item.avgCostCurrency || 'PLN')}` : ''}${item.valuationSource === 'snapshot' ? ` · wycena ze zrzutu (${item.snapshotAsOf || 'data notowania niepodana'})` : item.valuationSource === 'cost' ? ' · wycena po koszcie' : item.valuationSource === 'missing' ? ' · brak wyceny' : ''}`}
                    trailing={
                      <span className="block text-right">
                        {item.valuationSource === 'missing' ? '—' : formatPln(item.valuePln)}
                        <span className={`block text-sm ${tone(item.pnlPln)}`}>{pct(item.pnlPct)} łącznie</span>
                      </span>
                    }
                  >
                    <p className="mt-1 text-xs text-text-muted">
                      {item.assetClass === 'crypto' ? 'Zmiana dzienna' : 'Ostatnia sesja'}
                      {item.quoteAsOf ? ` · ${formatWarsawDate(item.quoteAsOf)}` : ' · data notowania niepodana'}
                      {' · '}
                      <span className={tone(item.dayChangePct)}>{pct(item.dayChangePct)}</span>
                    </p>
                  </FinanceRow>
                </Pressable>
              ))}
          </FinanceList>
        )}
        <div className="border-t border-border-custom/20 p-3">
          <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
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
