/** Animated segmented macro bar: Protein (blue) · Carbs (green) · Fat (orange).
 *  All segments transition-width together on each new log. */

interface MacroSegment {
  label: string;
  grams: number;
  kcal: number;
  color: string;
  textColor: string;
}

interface MacroProgressBarProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetKcal: number;
}

function buildSegments(protein: number, carbs: number, fat: number): MacroSegment[] {
  return [
    { label: 'B', grams: protein, kcal: protein * 4, color: 'bg-primary', textColor: 'text-primary' },
    { label: 'W', grams: carbs, kcal: carbs * 4, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { label: 'T', grams: fat, kcal: fat * 9, color: 'bg-amber-400', textColor: 'text-amber-400' },
  ];
}

export default function MacroProgressBar({
  calories,
  protein,
  carbs,
  fat,
  targetKcal,
}: MacroProgressBarProps) {
  const total = Math.max(1, targetKcal);
  const segments = buildSegments(protein, carbs, fat);
  const hasData = protein > 0 || carbs > 0 || fat > 0;

  return (
    <div className="space-y-1.5">
      {/* Segmented bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-border-custom/40 flex">
        {hasData ? (
          segments.map((seg) => (
            <div
              key={seg.label}
              className={`h-full ${seg.color} transition-[width] duration-500 ease-out`}
              style={{ width: `${Math.min(100, (seg.kcal / total) * 100)}%` }}
            />
          ))
        ) : (
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, (calories / total) * 100)}%` }}
          />
        )}
      </div>

      {/* Macro legend — only when we have breakdown data */}
      {hasData && (
        <div className="flex items-center gap-3">
          {segments.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1">
              <span className={`inline-block h-1.5 w-2.5 rounded-full ${seg.color}`} />
              <span className={`text-3xs font-black ${seg.textColor}`}>
                {Math.round(seg.grams)}g
              </span>
              <span className="text-3xs font-medium text-text-muted">{seg.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
