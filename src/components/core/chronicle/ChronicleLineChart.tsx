interface Props {
  values: Array<number | null>;
  labels: string[];
  unit: string;
  ariaLabel: string;
}

const W = 320;
const H = 140;
const PAD = { left: 10, right: 10, top: 14, bottom: 22 };

const format = (value: number) => value.toLocaleString('pl-PL', { maximumFractionDigits: 1 });

/** Prosty wykres liniowy: dni bez danych to przerwa, a punkty po obu stronach łączy linia przerywana. */
export default function ChronicleLineChart({ values, labels, unit, ariaLabel }: Props) {
  const known = values.flatMap((value, index) => (value == null ? [] : [{ index, value }]));
  if (!known.length) {
    return <p className="rounded-2xl border border-border-custom/40 bg-surface/40 px-3 py-6 text-center text-xs font-semibold text-text-muted">Brak danych do wykresu w tym okresie.</p>;
  }
  const min = Math.min(...known.map((p) => p.value));
  const max = Math.max(...known.map((p) => p.value));
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (values.length === 1 ? innerW / 2 : (index * innerW) / (values.length - 1));
  const y = (value: number) => PAD.top + innerH - ((value - lo) / (hi - lo)) * innerH;
  const step = values.length > 12 ? 3 : values.length > 8 ? 2 : 1;
  const last = known[known.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full text-primary">
      <title>{ariaLabel}</title>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * t} y2={PAD.top + innerH * t} stroke="currentColor" className="text-border-custom" strokeWidth={0.5} />
      ))}
      {known.slice(1).map((point, i) => {
        const prev = known[i];
        return (
          <line
            key={point.index}
            x1={x(prev.index)} y1={y(prev.value)} x2={x(point.index)} y2={y(point.value)}
            stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            strokeDasharray={point.index - prev.index > 1 ? '4 4' : undefined}
          />
        );
      })}
      {known.map((point) => (
        <circle key={point.index} cx={x(point.index)} cy={y(point.value)} r={point.index === last.index ? 4 : 2.5} fill="currentColor" />
      ))}
      <text x={Math.min(x(last.index), W - PAD.right)} y={Math.max(y(last.value) - 8, 10)} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-text-primary">
        {format(last.value)}{unit ? ` ${unit}` : ''}
      </text>
      {labels.map((label, index) => (index % step === 0 ? (
        <text key={`${label}-${index}`} x={x(index)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" className="text-text-muted">{label}</text>
      ) : null))}
    </svg>
  );
}
