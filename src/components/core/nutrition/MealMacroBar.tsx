import { formatDecimalPl } from '../../../lib/formatPl';

interface Props {
  calories: number | null;
  targetKcal: number | null;
  protein: number | null;
  targetProtein: number | null;
  fat: number | null;
  carbs: number | null;
}

/** Stałe podsumowanie wybranego dnia. Cele pokazujemy tylko wtedy, gdy je zapisano. */
export default function MealMacroBar({ calories, targetKcal, protein, targetProtein, fat, carbs }: Props) {
  // Cele tłuszczu i węgli są orientacyjne: tłuszcz = 30% kcal, węgle = reszta kcal po białku i tłuszczu.
  const fatTarget = targetKcal != null && targetKcal > 0 ? (targetKcal * 0.3) / 9 : null;
  const carbsTarget = targetKcal != null && targetKcal > 0 && targetProtein != null && fatTarget != null
    ? Math.max(0, (targetKcal - targetProtein * 4 - fatTarget * 9) / 4) : null;
  const metrics = [
    { id: 'calories', label: 'Kcal', value: calories, target: targetKcal, unit: '', barTarget: targetKcal },
    { id: 'protein', label: 'Białko', value: protein, target: targetProtein, unit: ' g', barTarget: targetProtein },
    { id: 'fat', label: 'Tłuszcze', value: fat, target: fatTarget, unit: ' g', barTarget: fatTarget },
    { id: 'carbs', label: 'Węgle', value: carbs, target: carbsTarget, unit: ' g', barTarget: carbsTarget },
  ];
  return (
    <div className="meal-macro-dock -mx-4 px-3 py-3" role="region" aria-label="Makroskładniki wybranego dnia">
      <ul className="grid list-none grid-cols-4 divide-x divide-border-custom p-0">
        {metrics.map(({ id, label, value, target, unit, barTarget }) => {
          const ratio = value != null && barTarget != null && barTarget > 0 ? Math.min(1, Math.max(0, value / barTarget)) : 0;
          return (
          <li key={id} className="meal-macro min-w-0 px-2 text-center" data-macro={id}>
            <span className="meal-bar-track mb-1.5 block h-1.5 overflow-hidden rounded-full" aria-hidden="true">
              <span className="meal-bar-fill block h-full w-full origin-left rounded-full" style={{ transform: `scaleX(${ratio})` }} />
            </span>
            <span className={`block text-2xs font-medium ${id === 'calories' ? 'text-text-muted' : 'meal-macro-label'}`}>{label}</span>
            <span className="block text-sm font-semibold tabular-nums text-text-primary">
              {value == null ? '—' : formatDecimalPl(value)}
              <span className="text-2xs font-normal text-text-muted"> / {target == null ? '—' : formatDecimalPl(Math.round(target))}{unit}</span>
            </span>
          </li>
          );
        })}
      </ul>
      {calories == null && <p className="mt-1 text-center text-2xs text-text-muted">Dziennik jedzenia · brak danych kcal</p>}
    </div>
  );
}
