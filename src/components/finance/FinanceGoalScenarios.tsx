import { buildGoalScenarios } from '../../lib/finance/goalScenarios';
import { formatMonths, formatPln } from '../../lib/finance/formatMoney';
import type { FinanceMetrics } from './useFinanceMetrics';

const monthsText = (months: number | null) => (months == null ? 'poza horyzontem 50 lat' : months === 0 ? 'już' : formatMonths(months));

/** Kiedy dojdziesz do celu przy różnych założeniach zysku i jak dodatkowe odkładanie zmienia termin. */
export default function FinanceGoalScenarios({ metrics }: { metrics: FinanceMetrics }) {
  const scenarios = buildGoalScenarios({
    netWorth: metrics.netWorth,
    target: metrics.netWorthTarget,
    monthlySaving: metrics.monthlySaving,
    expectedReturnPct: metrics.fireInput.expectedReturnPct,
    inflationPct: metrics.fireInput.inflationPct,
  });
  if (!scenarios || metrics.monthlySaving <= 0) return null;
  const effect = scenarios.extraSavingEffect;

  return (
    <div className="space-y-2 rounded-xl bg-surface-2 p-3.5">
      <p className="text-xs font-semibold tracking-wide text-text-muted">Kiedy cel, zależnie od zysku</p>
      <ul className="space-y-1 text-sm">
        {scenarios.returns.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="text-text-secondary">{row.label}</span>
            <span className="font-semibold tabular-nums text-text-primary">{monthsText(row.months)}</span>
          </li>
        ))}
      </ul>
      {effect?.monthsDifference != null && effect.monthsDifference !== 0 && (
        <p className="text-xs text-text-secondary">
          Dodatkowe {formatPln(effect.delta)} miesięcznie skraca cel o {Math.abs(effect.monthsDifference)} {Math.abs(effect.monthsDifference) === 1 ? 'miesiąc' : 'mies.'}.
        </p>
      )}
      {scenarios.savingFor12Months != null && (
        <p className="text-xs text-text-secondary">Żeby zdążyć w 12 miesięcy, trzeba odkładać ok. {formatPln(scenarios.savingFor12Months)} miesięcznie.</p>
      )}
      <p className="text-2xs text-text-muted">Liczone od dzisiejszego majątku netto i stałego odkładania; zysk przy giełdzie nie jest gwarantowany.</p>
    </div>
  );
}
