import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceEmpty } from './financeUi';
import type { FinanceMetrics } from './useFinanceMetrics';

export function FinanceEmergencyCard({ metrics, savings }: { metrics: FinanceMetrics; savings?: { balance: number; target: number } }) {
  const { emergency, liquid } = metrics;
  const progress = savings ? Math.max(0, Math.min(100, 100 * savings.balance / savings.target)) : emergency.progressPct;
  const missing = savings ? Math.max(0, savings.target - savings.balance) : emergency.missing;

  return (
    <section aria-label="Poduszka finansowa">
      <h3 className="px-5 pt-5 text-base font-semibold">Poduszka finansowa</h3>
      {!savings && emergency.months == null ? (
        <FinanceEmpty>Ustaw miesięczne wydatki w budżecie, żeby policzyć poduszkę.</FinanceEmpty>
      ) : (
        <div className="space-y-2 px-5 pb-5 pt-2">
          {savings && <p className="text-sm text-text-muted">Konto oszczędnościowe</p>}
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl font-semibold tabular-nums tracking-[var(--tracking-tight)] text-text-primary">
              {savings ? formatPln(savings.balance, 2) : `${emergency.months?.toFixed(1).replace('.', ',')} mies.`}
            </p>
            <p className="text-sm text-text-muted">Cel {savings ? formatPln(savings.target) : `${emergency.targetMonths} mies.`}</p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Poduszka finansowa"
          >
            <div
              className={`h-full rounded-full ${progress >= 100 ? 'bg-success' : 'bg-warning'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-text-muted">
            {savings
              ? missing > 0 ? `Brakuje ${formatPln(missing, 2)} do celu.` : 'Cel osiągnięty.'
              : missing > 0 ? `Płynne środki ${formatPln(liquid)}. Brakuje ${formatPln(missing)} do celu.`
                : `Płynne środki ${formatPln(liquid)} pokrywają cel poduszki.`}
          </p>
        </div>
      )}
    </section>
  );
}
