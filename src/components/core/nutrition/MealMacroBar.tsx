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
  const metrics = [
    { id: 'calories', label: 'Kcal', value: calories, target: targetKcal, unit: '' },
    { id: 'protein', label: 'Białko', value: protein, target: targetProtein, unit: ' g' },
    { id: 'fat', label: 'Tłuszcze', value: fat, unit: ' g' },
    { id: 'carbs', label: 'Węgle', value: carbs, unit: ' g' },
  ];
  return (
    <div className="meal-macro-dock -mx-4 px-3 py-3" role="region" aria-label="Makroskładniki wybranego dnia">
      <ul className="grid list-none grid-cols-4 divide-x divide-border-custom p-0">
        {metrics.map(({ id, label, value, target, unit }) => (
          <li key={id} className="meal-macro min-w-0 px-1 text-center" data-macro={id}>
            <span className={`block text-2xs font-medium ${id === 'calories' ? 'text-text-muted' : 'meal-macro-label'}`}>{label}</span>
            <span className="block text-sm font-semibold tabular-nums text-text-primary">
              {value == null ? '—' : formatDecimalPl(value)}
              {id === 'calories' || id === 'protein' ? (
                <span className="text-2xs font-normal text-text-muted"> / {target == null ? '—' : formatDecimalPl(target)}{unit}</span>
              ) : <span className="text-2xs font-normal text-text-muted">{unit}</span>}
            </span>
          </li>
        ))}
      </ul>
      {calories == null && <p className="mt-1 text-center text-2xs text-text-muted">Dziennik jedzenia · brak danych kcal</p>}
    </div>
  );
}
