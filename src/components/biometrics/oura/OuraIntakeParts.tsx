import {
  MIN_NIGHTS_PER_GROUP,
  type IntakeComparison,
  type NightGroup,
} from '../../../lib/biometrics/ouraIntakeInsights';

function fmt(value: number | null, unit = ''): string {
  return value == null ? '—' : `${value}${unit}`;
}

function delta(a: number | null, b: number | null, unit: string): string | null {
  if (a == null || b == null) return null;
  const d = Math.round((a - b) * 10) / 10;
  return `${d > 0 ? '+' : ''}${d}${unit}`;
}

function MetricRow({ label, a, b, unit }: { label: string; a: number | null; b: number | null; unit: string }) {
  const diff = delta(a, b, unit);
  return (
    <tr>
      <th scope="row" className="py-1 pr-2 text-left text-xs font-normal text-text-secondary">{label}</th>
      <td className="py-1 text-right text-sm text-text-primary">{fmt(a, unit)}</td>
      <td className="py-1 text-right text-sm text-text-primary">{fmt(b, unit)}</td>
      <td className="py-1 pl-2 text-right text-xs text-text-muted">{diff ?? ''}</td>
    </tr>
  );
}

function groupLabel(text: string, g: NightGroup) {
  return <>{text} <span className="text-text-muted">(n={g.n})</span></>;
}

export function Progress({ label, value }: { label: string; value: number }) {
  const shown = Math.min(value, MIN_NIGHTS_PER_GROUP);
  return (
    <div className="space-y-1">
      <p className="text-xs text-text-secondary">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MIN_NIGHTS_PER_GROUP}
        aria-valuenow={shown}
        className="h-1 overflow-hidden rounded-full bg-surface-3"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${(shown / MIN_NIGHTS_PER_GROUP) * 100}%` }} />
      </div>
    </div>
  );
}

export function ComparisonCard({ title, subtitle, withLabel, withoutLabel, comparison, progressVerb, hint }: {
  title: string;
  subtitle?: string | null;
  withLabel: string;
  withoutLabel: string;
  comparison: IntakeComparison;
  /** np. "Zaznaczone" albo "Zapisane". */
  progressVerb: string;
  hint: string;
}) {
  return (
    <article className="rounded-xl border border-border-custom bg-surface-2 p-5">
      <p className="text-sm text-text-primary">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      {comparison.status === 'insufficient' ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">Za mało danych</p>
          <Progress label={`${withLabel}: ${progressVerb} ${comparison.nWith} z ${MIN_NIGHTS_PER_GROUP} potrzebnych nocy`} value={comparison.nWith} />
          <Progress label={`${withoutLabel}: ${progressVerb} ${comparison.nWithout} z ${MIN_NIGHTS_PER_GROUP} potrzebnych nocy`} value={comparison.nWithout} />
          <p className="text-xs leading-5 text-text-muted">{hint}</p>
        </div>
      ) : (
        <table className="mt-4 w-full">
          <thead>
            <tr className="text-xs text-text-muted">
              <th />
              <th className="text-right font-normal">{groupLabel(withLabel, comparison.withGroup)}</th>
              <th className="text-right font-normal">{groupLabel(withoutLabel, comparison.withoutGroup)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <MetricRow label="Wynik snu" a={comparison.withGroup.sleepScore} b={comparison.withoutGroup.sleepScore} unit="" />
            <MetricRow label="HRV" a={comparison.withGroup.hrv} b={comparison.withoutGroup.hrv} unit=" ms" />
            <MetricRow label="Zasypianie" a={comparison.withGroup.latencyMin} b={comparison.withoutGroup.latencyMin} unit=" min" />
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-text-muted">To korelacja, nie dowód.</p>
    </article>
  );
}
