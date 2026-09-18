interface MedicalRangeGaugeProps {
  value: number;
  refLow: number | null;
  refHigh: number | null;
  refText?: string | null;
  flag?: string | null;
}

export default function MedicalRangeGauge({
  value,
  refLow,
  refHigh,
  refText,
  flag,
}: MedicalRangeGaugeProps) {
  if (refLow == null || refHigh == null || refHigh <= refLow) {
    return (
      <span className="text-3xs text-text-secondary font-mono">
        {refText || '—'}
      </span>
    );
  }

  const range = refHigh - refLow;
  const padding = range * 0.25;
  const totalMin = refLow - padding;
  const totalMax = refHigh + padding;
  const totalSpan = totalMax - totalMin;

  const rawPct = ((value - totalMin) / totalSpan) * 100;
  const positionPct = Math.max(4, Math.min(96, rawPct));

  const normalStartPct = ((refLow - totalMin) / totalSpan) * 100;
  const normalWidthPct = ((refHigh - refLow) / totalSpan) * 100;

  const isBelow = value < refLow;
  const isAbove = value > refHigh;
  const hasFlag = isBelow || isAbove || (flag && flag !== 'N' && flag !== 'normal');

  const dotColor = hasFlag
    ? 'bg-warning border-warning ring-2 ring-warning/30'
    : 'bg-primary border-primary';

  return (
    <div className="flex flex-col items-center gap-1 min-w-[100px] max-w-[120px] mx-auto">
      <span className="text-3xs font-mono font-bold text-text-secondary leading-none">
        {refLow} – {refHigh}
      </span>
      <div
        className="relative h-1.5 w-full rounded-full bg-surface-3 overflow-visible"
        title={`Zakres: ${refLow} – ${refHigh}, Wynik: ${value}`}
      >
        {/* Normal target corridor */}
        <div
          className="absolute top-0 bottom-0 rounded-full bg-primary/20 border-x border-primary/40"
          style={{
            left: `${normalStartPct}%`,
            width: `${normalWidthPct}%`,
          }}
        />

        {/* Current Value Marker Pin */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border shadow-xs ui-interactive ${dotColor}`}
          style={{ left: `${positionPct}%` }}
        />
      </div>
    </div>
  );
}
