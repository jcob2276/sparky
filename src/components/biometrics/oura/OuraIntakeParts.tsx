import { Coffee, Pill } from 'lucide-react';
import {
  MIN_NIGHTS_PER_GROUP,
  type IntakeComparison,
  type NightGroup,
  type TodayStackItem,
} from '../../../lib/biometrics/ouraIntakeInsights';

const DAY_START_HOUR = 6;
const DAY_SPAN_HOURS = 18; // 06:00–24:00

function hourPercent(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const pos = ((h + (m || 0) / 60 - DAY_START_HOUR) / DAY_SPAN_HOURS) * 100;
  return Math.min(100, Math.max(0, pos));
}

function StripRow({ label, icon: Icon, times, tone }: {
  label: string;
  icon: typeof Coffee;
  times: string[];
  tone: 'bg-warning' | 'bg-primary';
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-text-secondary">
        <Icon size={14} strokeWidth={1.8} /> {label}
      </span>
      <div className="relative h-3 flex-1 rounded-full bg-surface-3" role="img"
        aria-label={times.length ? `${label}: ${times.join(', ')}` : `${label}: brak wpisów`}>
        {times.map((t, i) => (
          <span
            key={`${t}-${i}`}
            title={t}
            className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full ${tone}`}
            style={{ left: `${hourPercent(t)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TodayStrip({ caffeineTimes, stack }: { caffeineTimes: string[]; stack: TodayStackItem[] }) {
  const supplementTimes = stack.flatMap((s) => (s.takenAt ? [s.takenAt] : []));
  return (
    <div className="space-y-3 rounded-xl border border-border-custom bg-surface-2 p-5">
      <p className="text-sm text-text-secondary">Dziś</p>
      <StripRow label="Kawa" icon={Coffee} times={caffeineTimes} tone="bg-warning" />
      <StripRow label="Suple" icon={Pill} times={supplementTimes} tone="bg-primary" />
      <div className="flex gap-3 text-xs text-text-muted">
        <span className="w-24 shrink-0" />
        <div className="flex flex-1 justify-between">
          <span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>
      {stack.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {stack.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3">
              <span className={s.taken ? 'text-text-primary' : 'text-text-secondary'}>{s.name}</span>
              <span className="text-xs text-text-muted">
                {s.taken
                  ? `Zażyty${s.takenAt ? ` o ${s.takenAt}` : ''}`
                  : s.plannedAt ? `Zaplanowany na ${s.plannedAt}` : 'Jeszcze nie zażyty'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-muted">Brak aktywnych suplementów na dziś.</p>
      )}
    </div>
  );
}

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

export function ComparisonCard({ title, subtitle, withLabel, withoutLabel, comparison }: {
  title: string;
  subtitle?: string | null;
  withLabel: string;
  withoutLabel: string;
  comparison: IntakeComparison;
}) {
  return (
    <article className="rounded-xl border border-border-custom bg-surface-2 p-5">
      <p className="text-sm text-text-primary">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      {comparison.status === 'insufficient' ? (
        <div className="mt-4 space-y-1">
          <p className="text-sm text-text-secondary">Za mało danych</p>
          <p className="text-xs leading-5 text-text-muted">
            Potrzeba min. {MIN_NIGHTS_PER_GROUP} nocy po obu stronach. Masz: {withLabel.toLowerCase()} {comparison.nWith},{' '}
            {withoutLabel.toLowerCase()} {comparison.nWithout}.
          </p>
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
