import { ChevronDown } from 'lucide-react';
import type { BaselineRow } from '../../../lib/biometrics/ouraBaselines';
import { OuraSectionHeader } from './shared/OuraSectionHeader';

/** `all`: every metric; `deviations`: only values outside the typical range, the rest folded into one line. */
export type BaselineMode = 'all' | 'deviations';

interface OuraBaselineRowsProps {
  rows: BaselineRow[];
  loading?: boolean;
  errorMessage?: string | null;
  mode?: BaselineMode;
}

function BaselineItem({ row }: { row: BaselineRow }) {
  const measured = row.rangeStartPct != null && row.rangeEndPct != null;
  const description = `${row.label}: ${row.latestText}. ${row.statusLabel}${measured ? `. Typowy zakres ${row.rangeText}` : `. ${row.rangeText}`}`;
  return (
    <li className="oura-base-row" data-tone={row.tone} data-status={row.status} aria-label={description}>
      <div className="oura-base-head">
        <span className="oura-base-name">{row.label}</span>
        <span className="oura-base-value">{row.latestText}</span>
      </div>
      {measured ? (
        <div className="oura-base-track" aria-hidden="true">
          <span className="oura-base-range" style={{ left: `${row.rangeStartPct}%`, width: `${(row.rangeEndPct ?? 0) - (row.rangeStartPct ?? 0)}%` }} />
          {row.latestPct != null && <span className="oura-base-dot" style={{ left: `${row.latestPct}%` }} />}
        </div>
      ) : (
        <progress className="oura-base-progress" max={row.needed} value={Math.min(row.nights, row.needed)} aria-label={`${row.nights} z ${row.needed} nocy z pomiarem`} />
      )}
      <div className="oura-base-foot">
        <span className="oura-base-status">{row.statusLabel}</span>
        <span className="oura-base-rangetext">{measured ? `Typowo ${row.rangeText}` : row.rangeText}</span>
      </div>
    </li>
  );
}

const isDeviation = (row: BaselineRow) => row.status === 'below' || row.status === 'above';
const isInNorm = (row: BaselineRow) => row.status === 'within';

function RowList({ rows }: { rows: BaselineRow[] }) {
  return <ul className="oura-base-list">{rows.map(row => <BaselineItem key={row.key} row={row} />)}</ul>;
}

function DeviationsBody({ rows }: { rows: BaselineRow[] }) {
  const deviations = rows.filter(isDeviation);
  const inNorm = rows.filter(isInNorm);
  const pending = rows.filter(row => !isDeviation(row) && !isInNorm(row));
  const normLabel = `${inNorm.length} ${inNorm.length === 1 ? 'wskaźnik' : 'wskaźniki'} w normie`;
  return (
    <>
      {deviations.length > 0
        ? <RowList rows={deviations} />
        : inNorm.length > 0 && <p className="oura-base-note">Wszystko mieści się w Twojej normie.</p>}
      {inNorm.length > 0 && (
        <details className="oura-base-fold">
          <summary>
            <span>{deviations.length > 0 ? normLabel : `Zobacz ${normLabel}`}</span>
            <ChevronDown size={16} aria-hidden="true" className="oura-base-fold-icon" />
          </summary>
          <RowList rows={inNorm} />
        </details>
      )}
      {pending.length > 0 && (
        <p className="text-xs leading-5 text-text-muted">
          Za mało historii do oceny: {pending.map(row => row.label.toLowerCase()).join(', ')}.
        </p>
      )}
    </>
  );
}

export function OuraBaselineRows({ rows, loading = false, errorMessage = null, mode = 'all' }: OuraBaselineRowsProps) {
  const compact = mode === 'deviations';
  return (
    <section className="oura-base" aria-labelledby="oura-base-title">
      {compact ? (
        <OuraSectionHeader id="oura-base-title" title="Dziś vs Twoja norma"
          subtitle="Tylko to, co wyszło poza Twój typowy zakres z 60 nocy. Pas to zakres, punkt to ostatnia noc." />
      ) : (
        <OuraSectionHeader id="oura-base-title" title="Dziś vs Twoja norma"
          subtitle="Pas pokazuje Twój typowy zakres (środkowe 50% ostatnich 60 nocy), punkt to ostatnia noc. Odchylenie nie oznacza samo w sobie, że jest gorzej lub lepiej." />
      )}
      {errorMessage ? <p role="alert" className="oura-base-note">{errorMessage}</p>
        : loading ? <p className="oura-base-note" role="status">Ładowanie historii snu…</p>
          : rows.length === 0 ? <p className="oura-base-note">Brak historii snu do porównania.</p>
            : compact ? <DeviationsBody rows={rows} /> : <RowList rows={rows} />}
    </section>
  );
}
