import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ImpactFactor } from '@vanguard/domain';
import { CATEGORY_LABELS, rColor } from '@vanguard/domain';
import { Card } from '../ui/Card';

interface Props {
  item: ImpactFactor;
  /** If true, always show the scatter plot (for confirmed/probable) */
  showChart?: boolean;
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: { day: string; x: number; y: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-custom bg-surface px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-text-muted text-2xs">{p.day}</p>
      <p className="font-bold text-text-primary">{p.x.toFixed(1)} → {p.y.toFixed(1)}</p>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ImpactFactor['evidence_level'] }) {
  switch (level) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-3xs font-black uppercase tracking-widest text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
          Pewny
        </span>
      );
    case 'probable':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-3xs font-black uppercase tracking-widest text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
          Sygnał
        </span>
      );
    case 'hypothesis':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 border border-warning/20 px-2 py-0.5 text-3xs font-black uppercase tracking-widest text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block" />
          Słaby
        </span>
      );
    default:
      return null;
  }
}

function lagLabel(lag: number): string {
  if (lag === 0) return 'tego samego dnia';
  if (lag === 1) return 'następnego dnia';
  return `+${lag} dni później`;
}

export default function CorrelationCard({ item, showChart = false }: Props) {
  const color = rColor(item.r);
  const hasEnoughForChart = item.scatter.length >= 5;
  const displayChart = showChart && hasEnoughForChart;
  const direction = item.r > 0 ? '↑' : '↓';
  const directionColor = item.r > 0 ? 'text-success' : 'text-danger';

  // Border color by tier
  const borderClass =
    item.evidence_level === 'confirmed'
      ? 'border-success/20 hover:border-success/30'
      : item.evidence_level === 'probable'
      ? 'border-primary/20 hover:border-primary/30'
      : 'border-border-custom hover:border-border-custom-hover';

  return (
    <Card
      variant="surface"
      padding="0"
      className={`border transition-colors duration-[var(--motion-fast)] ${borderClass} overflow-hidden`}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top row: category + badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-3xs font-bold uppercase tracking-wider text-text-muted">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
          <ConfidenceBadge level={item.evidence_level} />
        </div>

        {/* Main insight: effect first */}
        <div>
          <p className="text-xs font-semibold text-text-secondary leading-snug">
            {item.x_label}
            {item.lag_days > 0 && (
              <span className="text-text-muted"> → {lagLabel(item.lag_days)}</span>
            )}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black tabular-nums leading-none ${directionColor}`}>
              {direction} {item.natural_effect.split(' ')[0]}
            </span>
            <span className="text-xs font-semibold text-text-muted">
              {item.y_label}
            </span>
          </div>
          {/* natural effect detail (everything after first word) */}
          {item.natural_effect.includes('(') && (
            <p className="text-2xs text-text-muted mt-0.5">
              {item.natural_effect.replace(/^[^\s]+\s/, '')}
            </p>
          )}
        </div>

        {/* Scatter chart */}
        {displayChart && (
          <div className="h-[120px] w-full -mx-0.5">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  name={item.x_label}
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name={item.y_label}
                  tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                  width={28}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ScatterTip />} />
                <ReferenceLine
                  x={item.scatter.reduce((s, p) => s + p.x, 0) / item.scatter.length}
                  stroke="var(--color-border-custom)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Scatter data={item.scatter} fill={color} fillOpacity={0.7} r={3} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-3 pt-1 border-t border-border-custom/40">
          <span className="text-2xs text-text-muted font-medium">
            N=<span className="font-bold text-text-secondary">{item.n}</span>
          </span>
          <span className="text-2xs font-bold tabular-nums" style={{ color }}>
            r={item.r > 0 ? '+' : ''}{item.r.toFixed(2)}
          </span>
          {item.is_stable && (
            <span className="text-2xs text-success font-semibold ml-auto">
              ✓ stabilny
            </span>
          )}
          {!item.is_stable && item.evidence_level !== 'hypothesis' && (
            <span className="text-2xs text-text-muted ml-auto">niestabilny</span>
          )}
        </div>
      </div>
    </Card>
  );
}
