import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceEmpty } from './financeUi';
import type { FinanceMetrics } from './useFinanceMetrics';

export function FinanceEmergencyCard({ metrics }: { metrics: FinanceMetrics }) {
  const { emergency, liquid } = metrics;

  return (
    <section aria-label="Poduszka finansowa">
      <h3 className="px-5 pt-5 text-base font-semibold">Poduszka finansowa</h3>
      {emergency.months == null ? (
        <FinanceEmpty>Wpisz miesięczne wydatki w Przepływach, żeby policzyć poduszkę.</FinanceEmpty>
      ) : (
        <div className="space-y-2 px-5 pb-5 pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">
              {emergency.months.toFixed(1).replace('.', ',')} mies.
            </p>
            <p className="text-sm text-text-muted">cel {emergency.targetMonths} mies.</p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(emergency.progressPct)}
            aria-label="Poduszka finansowa"
          >
            <div
              className={`h-full rounded-full ${emergency.progressPct >= 100 ? 'bg-success' : 'bg-warning'}`}
              style={{ width: `${emergency.progressPct}%` }}
            />
          </div>
          <p className="text-sm text-text-muted">
            {emergency.missing > 0
              ? `Płynne środki ${formatPln(liquid)}. Brakuje ${formatPln(emergency.missing)} do celu.`
              : `Płynne środki ${formatPln(liquid)} pokrywają cel poduszki.`}
          </p>
        </div>
      )}
    </section>
  );
}
