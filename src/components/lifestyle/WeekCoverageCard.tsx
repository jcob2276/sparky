import { buildWeekCoverage, buildWeekReport, type WeekFacts } from '../../lib/goal/weekFacts';

const STATUS_TEXT = { ok: 'text-success', gap: 'text-warning', info: 'text-text-primary' } as const;

/** Pasek pokrycia tygodnia; w niedzielę pokazuje też skrócony raport z liczbami i lukami. */
export default function WeekCoverageCard({ facts, showReport }: { facts: WeekFacts; showReport: boolean }) {
  const rows = buildWeekCoverage(facts);
  const report = buildWeekReport(facts);
  return (
    <section aria-label={showReport ? 'Raport tygodnia' : 'Pokrycie tygodnia'} className="space-y-3">
      <h2 className="text-xs font-semibold text-text-muted">{showReport ? 'Raport tygodnia' : 'Pokrycie tygodnia'}</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-lg border border-border-custom/50 bg-surface p-3">
            <dt className="text-2xs font-semibold text-text-muted">{row.label}</dt>
            <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${STATUS_TEXT[row.status]}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {showReport && (
        <div className="space-y-1.5 rounded-lg border border-border-custom/50 bg-surface p-3 text-xs text-text-secondary">
          <ul className="space-y-1">
            {report.lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          {report.gaps.length > 0 && (
            <p className="pt-1 font-semibold text-warning">Luki w danych: {report.gaps.join(' · ')}</p>
          )}
        </div>
      )}
    </section>
  );
}
