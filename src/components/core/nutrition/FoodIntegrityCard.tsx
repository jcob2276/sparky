import { ShieldCheck } from 'lucide-react';
import WeeklyCollapsible from '../WeeklyCollapsible';
import Button from '../../ui/Button';
import { useFoodIntegrity } from './hooks/useFoodIntegrity';
import { energyFixCalories, type NutrientTrust } from '../../../lib/health/foodIntegrityView';
import { formatWarsawDate } from '../../../lib/date';

const TRUST_LABEL: Record<NutrientTrust, string> = { pewne: 'pewne', czesciowe: 'częściowe', niepewne: 'niepewne' };
const TRUST_CLASS: Record<NutrientTrust, string> = {
  pewne: 'text-success',
  czesciowe: 'text-warning',
  niepewne: 'text-danger',
};
const MAX_VISIBLE_FINDINGS = 5;

/** Tygodniowy samoaudyt jedzenia: pewność każdego składnika i rzeczy do sprawdzenia, z jawną poprawką zamiast cichej zmiany liczb. */
export default function FoodIntegrityCard() {
  const { query, dismiss, applyFix, runNow } = useFoodIntegrity();
  const data = query.data;
  const open = data?.findings.length ?? 0;
  const summary = query.isLoading
    ? 'Ładuję…'
    : !data?.ranAt ? 'Jeszcze nie sprawdzano' : open === 0 ? 'Dane w porządku' : `${open} do sprawdzenia`;

  return (
    <WeeklyCollapsible icon={<ShieldCheck size={12} className="text-primary" />} title="Jakość danych" summary={summary}>
      {data && data.view.nutrients.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0" aria-label="Pewność danych składników">
          {data.view.nutrients.map((row) => (
            <li key={row.key} className="rounded-2xl border border-border-custom/40 bg-surface/50 px-3 py-2">
              <p className="text-2xs font-semibold tracking-wide text-text-muted">{row.label}</p>
              <p className={`text-sm font-semibold tabular-nums ${TRUST_CLASS[row.trust]}`}>
                {TRUST_LABEL[row.trust]} · {row.knownKcalSharePct}%
              </p>
            </li>
          ))}
        </ul>
      )}
      {data?.view.estimatedSharePct != null && (
        <p className="text-2xs font-semibold text-text-muted">
          {data.view.estimatedSharePct}% kalorii tygodnia to szacunek · procent = udział kalorii z wpisów, które mają daną wartość
        </p>
      )}

      {data && data.findings.slice(0, MAX_VISIBLE_FINDINGS).map((finding) => {
        const fixCalories = energyFixCalories(finding);
        return (
          <div key={finding.id} className="space-y-2 rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
            <p className="text-xs font-semibold text-text-secondary">{finding.message}</p>
            <div className="flex flex-wrap gap-2">
              {fixCalories != null && (
                <Button size="sm" variant="tonal" loading={applyFix.isPending} onClick={() => applyFix.mutate(finding)}>
                  Popraw na {fixCalories} kcal
                </Button>
              )}
              <Button size="sm" variant="ghost" loading={dismiss.isPending} onClick={() => dismiss.mutate(finding)}>
                Pomiń
              </Button>
            </div>
          </div>
        );
      })}
      {open > MAX_VISIBLE_FINDINGS && (
        <p className="text-2xs font-semibold text-text-muted">+{open - MAX_VISIBLE_FINDINGS} kolejnych po rozwiązaniu tych</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold text-text-muted">
          {data?.ranAt ? `Ostatni audyt ${formatWarsawDate(data.ranAt)} · co poniedziałek automatycznie` : 'Audyt rusza co poniedziałek'}
        </p>
        <Button size="sm" variant="outline" loading={runNow.isPending} onClick={() => runNow.mutate()}>
          Sprawdź teraz
        </Button>
      </div>
      {(runNow.isError || applyFix.isError) && (
        <p role="alert" className="text-xs font-semibold text-danger">Nie udało się wykonać akcji. Spróbuj ponownie.</p>
      )}
    </WeeklyCollapsible>
  );
}
