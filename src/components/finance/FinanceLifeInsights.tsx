import { useStore } from '../../store/useStore';
import { useCorrelationsQuery } from '../../lib/correlationsApi';
import { selectFinanceInsights } from '../../lib/finance/financeInsights';

/** Wydatki w zestawieniu z resztą życia (sen, ruch, nastrój): tylko to, co silnik korelacji uznał za istotne. */
export function FinanceLifeInsights() {
  const userId = useStore(s => s.session?.user?.id);
  const query = useCorrelationsQuery(userId, false);
  const insights = selectFinanceInsights(query.data?.correlations ?? []);
  if (!insights.length) return null;
  return (
    <section aria-label="Finanse a reszta życia">
      <h2 className="ios-section-title mb-2 px-1">Finanse a reszta życia</h2>
      <ul className="ios-group divide-y divide-border-custom/20">
        {insights.map(item => (
          <li key={item.id} className="space-y-0.5 px-4 py-3">
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            <p className="text-sm text-text-secondary">{item.interpretation}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-xs text-text-muted">To korelacje z Twoich danych, nie dowód przyczyny.</p>
    </section>
  );
}
