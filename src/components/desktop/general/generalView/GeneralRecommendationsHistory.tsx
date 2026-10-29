import type React from 'react';

export function MetricGroupHeader({ metric, count, color, icon }: { metric: string; count: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide" style={{ color }}>
        {icon}
        {metric}
      </span>
      <span className="text-2xs text-text-muted bg-surface-solid px-1.5 py-0.5 rounded-full font-bold">{count}</span>
      <div className="h-px flex-1 bg-border-custom" />
    </div>
  );
}
