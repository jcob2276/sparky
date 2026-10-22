import { useMemo, useState } from 'react';
import { computeRebalancePlan, type ValuedHolding } from '@vanguard/domain';
import { formatPln } from '../../lib/finance/formatMoney';
import Button from '../ui/Button';
import { ControlInput } from '../ui/ControlPrimitives';
import { ToggleChip } from '../ui/ToggleChip';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

interface FinanceRebalanceCardProps {
  holdings: ValuedHolding[];
  onBought: (holding: ValuedHolding, units: number, pricePln: number) => void;
}

const PRESETS = [500, 1000, 1500, 3000];

export function FinanceRebalanceCard({ holdings, onBought }: FinanceRebalanceCardProps) {
  const [amount, setAmount] = useState('1500');
  const value = Number(amount.replace(',', '.')) || 0;
  const hasTargets = holdings.some((item) => (item.targetWeightPct ?? 0) > 0);
  const plan = useMemo(() => computeRebalancePlan(holdings, value), [holdings, value]);
  const byId = useMemo(() => new Map(holdings.map((item) => [item.id, item])), [holdings]);

  return (
    <FinanceSection
      title="Kalkulator dopłaty"
      subtitle="Wyrównuje wagi do celów bez sprzedaży: dopłacasz tylko do pozycji poniżej celu."
    >
      {!hasTargets ? (
        <FinanceEmpty>Ustaw cel wagi (%) przy pozycjach, a policzę, gdzie dopłacić.</FinanceEmpty>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <ControlInput
              type="number"
              inputMode="decimal"
              min="0"
              aria-label="Kwota dopłaty"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-h-11 w-32 rounded-xl border-0 bg-surface-2/80 px-3 text-base tabular-nums ring-1 ring-border-custom/30"
            />
            <span className="text-sm text-text-muted">zł</span>
            {PRESETS.map((preset) => (
              <ToggleChip key={preset} size="sm" active={value === preset} onClick={() => setAmount(String(preset))}>{preset}</ToggleChip>
            ))}
          </div>
          {plan.buys.length === 0 ? (
            <p className="text-sm text-text-muted">Wszystkie pozycje z celem są na poziomie lub powyżej celu.</p>
          ) : (
            <FinanceList>
              {plan.buys.map((buy) => {
                const holding = byId.get(buy.id);
                return (
                  <FinanceRow
                    key={buy.id}
                    primary={buy.ticker}
                    secondary={`${buy.units != null ? `≈ ${buy.units} szt. · ` : ''}po dopłacie ${buy.weightAfterPct.toFixed(1).replace('.', ',')}%`}
                    trailing={<span className="text-success">{formatPln(buy.buyPln, 2)}</span>}
                  >
                    {holding && buy.units != null && holding.pricePln != null && (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onBought(holding, buy.units!, holding.pricePln!)}
                        >
                          Kupione, dopisz do portfela
                        </Button>
                      </div>
                    )}
                  </FinanceRow>
                );
              })}
            </FinanceList>
          )}
          {plan.leftoverPln > 0.5 && plan.buys.length > 0 && (
            <p className="text-sm text-text-muted">Reszta {formatPln(plan.leftoverPln, 2)} nie ma gdzie trafić według celów.</p>
          )}
        </div>
      )}
    </FinanceSection>
  );
}
