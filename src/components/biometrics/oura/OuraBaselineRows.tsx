import type { BaselineRow } from '../../../lib/biometrics/ouraBaselines';

interface OuraBaselineRowsProps {
  rows: BaselineRow[];
  loading?: boolean;
  errorMessage?: string | null;
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

export function OuraBaselineRows({ rows, loading = false, errorMessage = null }: OuraBaselineRowsProps) {
  return (
    <section className="oura-base" aria-labelledby="oura-base-title">
      <header>
        <h2 id="oura-base-title" className="text-2xl font-light">Dziś vs Twoja norma</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Pas pokazuje Twój typowy zakres (środkowe 50% ostatnich 60 nocy), punkt to ostatnia noc.
          Odchylenie nie oznacza samo w sobie, że jest gorzej lub lepiej.
        </p>
      </header>
      {errorMessage ? <p role="alert" className="oura-base-note">{errorMessage}</p>
        : loading ? <p className="oura-base-note" role="status">Ładowanie historii snu…</p>
          : rows.length === 0 ? <p className="oura-base-note">Brak historii snu do porównania.</p>
            : <ul className="oura-base-list">{rows.map(row => <BaselineItem key={row.key} row={row} />)}</ul>}
    </section>
  );
}
