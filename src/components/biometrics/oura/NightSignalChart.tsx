interface NightSignalPoint {
  ts: string;
  value: number | null;
}

interface NightSignalChartProps {
  ariaLabel: string;
  average: number | null;
  averageLabel: string;
  colorClass: string;
  points: NightSignalPoint[];
  summary: string;
  title: string;
  unit: string;
}

const WIDTH = 640;
const HEIGHT = 190;
const PADDING = 20;

function chartPoints(points: NightSignalPoint[]): string {
  const measured = points.filter(
    (point): point is NightSignalPoint & { value: number } => point.value != null,
  );
  if (measured.length < 2) return '';
  const values = measured.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return measured.map((point, index) => {
    const x = PADDING + index / (measured.length - 1) * (WIDTH - PADDING * 2);
    const y = PADDING + (max - point.value) / range * (HEIGHT - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function timeLabel(ts: string | undefined): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(ts));
}

export function NightSignalChart({
  ariaLabel,
  average,
  averageLabel,
  colorClass,
  points,
  summary,
  title,
  unit,
}: NightSignalChartProps) {
  const polyline = chartPoints(points);
  return (
    <article className="overflow-hidden rounded-xl border border-white/5 bg-surface-2 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{title}</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-1">
        <p className="text-4xl font-light text-white">
          {average == null ? 'Brak danych' : `${average} ${unit}`}
        </p>
        <p className="pb-1 text-sm text-text-secondary">{summary}</p>
      </div>
      {polyline ? (
        <>
          <svg
            aria-label={ariaLabel}
            className="mt-7 h-48 w-full"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            {[0.25, 0.5, 0.75].map((position) => (
              <line
                key={position}
                className="text-white/10"
                stroke="currentColor"
                x1={PADDING}
                x2={WIDTH - PADDING}
                y1={HEIGHT * position}
                y2={HEIGHT * position}
              />
            ))}
            <polyline
              className={colorClass}
              fill="none"
              points={polyline}
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
          <div className="flex justify-between text-xs text-text-muted">
            <span>{timeLabel(points[0]?.ts)}</span>
            <span>{averageLabel}</span>
            <span>{timeLabel(points.at(-1)?.ts)}</span>
          </div>
        </>
      ) : (
        <div className="mt-7 grid h-36 place-items-center rounded-lg bg-black/10 px-4 text-center text-sm text-text-muted">
          Brak pełnego przebiegu dla tej nocy
        </div>
      )}
    </article>
  );
}
