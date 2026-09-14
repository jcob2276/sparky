import { LIFE_SPHERES, type LifeSphereId } from '../../lib/projects/lifeSpheres';

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 100;

function polarPoint(index: number, radiusFraction: number) {
  const angle = index * ((2 * Math.PI) / 6) - Math.PI / 2;
  const r = RADIUS * Math.max(0, Math.min(1, radiusFraction));
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

export type BudgetBounds = { min: number | null; max: number | null };

export function emptyBudgetMap(): Record<LifeSphereId, BudgetBounds> {
  return Object.fromEntries(
    LIFE_SPHERES.map((s) => [s.id, { min: null, max: null }]),
  ) as Record<LifeSphereId, BudgetBounds>;
}

export function polygonPoints(values: number[], scale: number) {
  return values
    .map((v, i) => {
      const p = polarPoint(i, scale > 0 ? v / scale : 0);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

export function WeeklyBalanceRadarSvg({
  budgetPoints,
  actualPoints,
  selectedTaskId,
  onAssignTask,
  onStartEditing,
}: {
  budgetPoints: string;
  actualPoints: string;
  selectedTaskId: string | null;
  onAssignTask: (s: LifeSphereId) => void;
  onStartEditing: (s: LifeSphereId) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg width={SIZE} height={SIZE} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon
            key={k}
            points={LIFE_SPHERES.map((_, i) => {
              const p = polarPoint(i, k);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            className="text-border-custom"
            strokeWidth={1}
            strokeDasharray={k === 1 ? 'none' : '2,3'}
          />
        ))}
        {LIFE_SPHERES.map((_, i) => {
          const p = polarPoint(i, 1);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              className="text-border-custom"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={budgetPoints}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="4,3"
        />
        <polygon
          points={actualPoints}
          fill="var(--primary-18)"
          stroke="var(--primary-80)"
          strokeWidth={2}
        />

        {LIFE_SPHERES.map((s, i) => {
          const p = polarPoint(i, 1.22);
          const shortLabel = s.label.split('/')[0].trim();
          return (
            <text
              key={s.id}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-3xs font-black uppercase tracking-wider fill-text-primary cursor-pointer hover:fill-primary"
              onClick={() => (selectedTaskId ? onAssignTask(s.id) : onStartEditing(s.id))}
            >
              {shortLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
