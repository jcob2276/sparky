import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { HoldingInput, PortfolioTotals, ValuedHolding } from '@vanguard/domain';
import type { HoldingFormInput, HoldingMutations } from '../../lib/finance/holdingsApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { confirmDialog } from '../../lib/notify';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { Pressable } from '../ui/ControlPrimitives';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';
import { FinanceHoldingForm } from './FinanceHoldingForm';
import { FinanceRebalanceCard } from './FinanceRebalanceCard';

interface FinancePortfolioTabProps {
  holdings: ValuedHolding[];
  totals: PortfolioTotals;
  mutations: HoldingMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

const pct = (value: number | null) => (value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`);
const tone = (value: number | null) => (value == null || value === 0 ? 'text-text-muted' : value > 0 ? 'text-success' : 'text-danger');

function Summary({ totals }: { totals: PortfolioTotals }) {
  return (
    <section className="space-y-1 pt-1">
      <p className="text-sm text-text-muted">Wartość portfela</p>
      <p className="text-3xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">{formatPln(totals.valuePln)}</p>
      <p className="text-sm tabular-nums">
        <span className={tone(totals.pnlPln)}>{formatPln(totals.pnlPln)} ({pct(totals.pnlPct)}) łącznie</span>
        <span className="text-text-muted"> · dziś </span>
        <span className={tone(totals.dayChangePln)}>{formatPln(totals.dayChangePln)} ({pct(totals.dayChangePct)})</span>
      </p>
      {totals.unquotedCount > 0 && (
        <p className="text-sm text-warning">{totals.unquotedCount} poz. bez notowania jest wyceniona po koszcie zakupu.</p>
      )}
    </section>
  );
}

export function FinancePortfolioTab({ holdings, totals, mutations, run }: FinancePortfolioTabProps) {
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
    await run(async () => { await mutations.removeHolding.mutateAsync(target.id); });
    close();
  };

  return (
    <div className="space-y-8">
      <Summary totals={totals} />

      <FinanceSection title="Pozycje">
        {holdings.length === 0 ? (
          <FinanceEmpty>Dodaj pierwszą pozycję: symbol notowań, ilość i średnią cenę zakupu w PLN.</FinanceEmpty>
        ) : (
          <FinanceList>
            {[...holdings].sort((a, b) => b.valuePln - a.valuePln).map((item) => (
              <Pressable key={item.id} type="button" onClick={() => setEditing(item)} className="block w-full text-left transition-colors hover:bg-surface-2/50">
                <FinanceRow
                  primary={item.ticker}
                  secondary={`${item.name} · ${item.weightPct.toFixed(1).replace('.', ',')}%${item.targetWeightPct != null ? ` / cel ${item.targetWeightPct}%` : ''}`}
                  trailing={(
                    <span className="block text-right">
                      {formatPln(item.valuePln)}
                      <span className={`block text-sm ${tone(item.pnlPln)}`}>{pct(item.pnlPct)}</span>
                    </span>
                  )}
                />
              </Pressable>
            ))}
          </FinanceList>
        )}
        <div className="border-t border-border-custom/20 p-3">
          <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>Dodaj pozycję</Button>
        </div>
      </FinanceSection>

      <FinanceRebalanceCard
        holdings={holdings}
        onBought={(holding, units, pricePln) => void run(async () => {
          await mutations.addPurchase.mutateAsync({ holding, units, pricePln });
        })}
      />

      <Sheet open={editing != null} onOpenChange={(open) => { if (!open) close(); }} title={editing === 'new' ? 'Nowa pozycja' : 'Edytuj pozycję'} side="bottom" compact>
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
