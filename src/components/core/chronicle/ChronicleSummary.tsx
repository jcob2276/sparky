import type { ChronicleSummaryData, ChronicleTile } from '../../../lib/chronicle/summaryTypes';
import Skeleton from '../../ui/Skeleton';
import ChronicleLineChart from './ChronicleLineChart';

const TONE_CLASS: Record<ChronicleTile['tone'], string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-text-muted',
};

function Tile({ tile, wide, compareLabel }: { tile: ChronicleTile; wide: boolean; compareLabel: string }) {
  return (
    <div className={`rounded-2xl border border-border-custom/40 bg-surface/50 p-3 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-2xs font-semibold tracking-wide text-text-muted">{tile.label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
        {tile.value}
        {tile.hint && <span className="ml-1 text-2xs font-bold text-text-muted">{tile.hint}</span>}
      </p>
      <p className={`text-2xs font-bold tabular-nums ${TONE_CLASS[tile.tone]}`}>
        {tile.delta ? `${tile.delta} vs ${compareLabel}` : 'brak porównania'}
      </p>
    </div>
  );
}

/** Kafelki w kolejności pierwszego wystąpienia grupy; bez grup wszystko idzie jednym blokiem. */
function groupTiles(tiles: ChronicleTile[]): Array<{ title: string | null; tiles: ChronicleTile[] }> {
  const groups: Array<{ title: string | null; tiles: ChronicleTile[] }> = [];
  for (const tile of tiles) {
    const title = tile.group ?? null;
    const existing = groups.find((g) => g.title === title);
    if (existing) existing.tiles.push(tile);
    else groups.push({ title, tiles: [tile] });
  }
  return groups;
}

interface Props {
  summary: ChronicleSummaryData | null;
  loading: boolean;
  error: Error | null;
  periodTitle: string;
  /** Z czym zestawiono okres w kafelkach (domyślnie poprzedni). */
  compareLabel?: string;
  /** Wykres ma sens dopiero od miesiąca w górę; w tygodniu jest za mało punktów. */
  showChart?: boolean;
}

/** Cel, kafelki ze zmianą względem poprzedniego okresu, wykres i uczciwe braki danych jednej zakładki Kroniki. */
export default function ChronicleSummary({ summary, loading, error, periodTitle, compareLabel = 'poprzedni', showChart = true }: Props) {
  if (loading) return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (error || !summary) {
    return <p className="rounded-2xl border border-warning/30 bg-warning/10 px-3 py-3 text-xs font-semibold text-warning">Nie udało się wczytać danych tego okresu.</p>;
  }
  const { goalLine, tiles, chart, notes } = summary;
  const groups = groupTiles(tiles);
  return (
    <section className="space-y-3" aria-label={`Podsumowanie: ${goalLine.title}`}>
      <div className="space-y-1.5 rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xs font-semibold tracking-wide text-text-muted">{goalLine.title} · {periodTitle}</p>
          {goalLine.pct != null && <span className="text-xs font-semibold tabular-nums text-text-primary">{goalLine.pct}%</span>}
        </div>
        {goalLine.pct != null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalLine.pct} aria-label="Postęp do celu">
            <div className="h-full rounded-full bg-primary" style={{ width: `${goalLine.pct}%` }} />
          </div>
        )}
        <p className="text-xs font-semibold text-text-secondary">{goalLine.hint}</p>
      </div>

      {groups.map((group) => (
        <div key={group.title ?? 'all'} className="space-y-1.5">
          {group.title && <p className="px-1 text-2xs font-semibold tracking-wide text-text-muted">{group.title}</p>}
          <div className="grid grid-cols-2 gap-2">
            {group.tiles.map((tile, index) => (
              <Tile key={tile.label} tile={tile} wide={group.tiles.length % 2 === 1 && index === group.tiles.length - 1} compareLabel={compareLabel} />
            ))}
          </div>
        </div>
      ))}

      {showChart && (
        <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
          <p className="text-2xs font-semibold tracking-wide text-text-muted">{chart.label}</p>
          <ChronicleLineChart values={chart.values} labels={chart.labels} unit={chart.unit} ariaLabel={`${chart.label}, ${periodTitle}`} />
        </div>
      )}

      {notes.length > 0 && (
        <ul className="space-y-0.5 px-1">
          {notes.map((note) => <li key={note} className="text-2xs font-semibold text-text-muted">{note}</li>)}
        </ul>
      )}
    </section>
  );
}
