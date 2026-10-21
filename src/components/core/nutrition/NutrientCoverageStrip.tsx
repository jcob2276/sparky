import type { DayNutrientCoverage, NutrientCoverage } from '../../../lib/health/nutrientCoverage';

function Cell({ label, data }: { label: string; data: NutrientCoverage }) {
  if (data.items === 0) return null;
  const missing = data.known < data.items;
  return (
    <span
      className="tabular-nums"
      title={missing ? `Dane dla ${data.known} z ${data.items} pozycji, reszta bez wartości` : undefined}
    >
      {label}{' '}
      {data.known === 0 ? (
        <span className="font-black text-warning">brak danych</span>
      ) : (
        <>
          <span className="font-black text-text-primary">{missing ? '≥ ' : ''}{data.total} g</span>
          {missing && <span className="text-warning"> ({data.known}/{data.items})</span>}
        </>
      )}
    </span>
  );
}

/** Błonnik i nasycone z dnia; przy brakujących danych pokazuje „≥” i pokrycie zamiast udawać pełną sumę. */
export default function NutrientCoverageStrip({ coverage }: { coverage: DayNutrientCoverage }) {
  if (coverage.fiber.items === 0) return null;
  return (
    <p className="flex flex-wrap gap-x-3 text-2xs font-semibold text-text-muted" aria-label="Błonnik i tłuszcze nasycone">
      <Cell label="Błonnik" data={coverage.fiber} />
      <Cell label="Nasycone" data={coverage.saturatedFat} />
    </p>
  );
}
