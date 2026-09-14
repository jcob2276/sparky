import React from 'react';
import type { OracleRecommendation } from '../../../../lib/recommendationsApi';
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { METRIC_META, getMetaMeta } from './recommendationConfig';

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  switch (outcome) {
    case 'success':
      return (
        <span className="flex items-center gap-1 bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider">
          <CheckCircle2 size={10} />
          Sukces
        </span>
      );
    case 'fail':
      return (
        <span className="flex items-center gap-1 bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider">
          <XCircle size={10} />
          Porażka
        </span>
      );
    case 'no_data':
      return (
        <span className="flex items-center gap-1 bg-surface-solid text-text-muted border border-border-custom px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider">
          <HelpCircle size={10} />
          Brak danych
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider">
          Ewaluacja
        </span>
      );
  }
}

export function HistoryTimelineItem({ rec }: { rec: OracleRecommendation }) {
  const [expanded, setExpanded] = React.useState(false);
  const baselineVal = rec.baseline_value !== null ? rec.baseline_value.toFixed(1) : '—';
  const actualVal = rec.actual_value !== null ? rec.actual_value.toFixed(1) : '—';

  const dotColor =
    rec.outcome === 'success'
      ? 'var(--color-success)'
      : rec.outcome === 'fail'
        ? 'var(--color-danger)'
        : 'var(--color-text-muted)';

  return (
    <div className="flex items-start gap-3 group cursor-pointer" onClick={() => setExpanded((v) => !v)}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 ring-offset-1 ring-offset-[var(--color-surface-solid)]"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 0 2px ${dotColor}` }}
        />
        <div className="w-px flex-1 min-h-[1.5rem] bg-border-custom/40 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className={`text-2xs leading-snug ${expanded ? 'text-text-secondary' : 'text-text-muted line-clamp-1'} font-medium transition-all`}>
            {rec.recommendation_text}
          </p>
          <div className="shrink-0">
            <OutcomeBadge outcome={rec.outcome} />
          </div>
        </div>
        {expanded && (
          <div className="flex flex-wrap gap-3 text-2xs text-text-muted mt-1.5">
            <span>{getMetaMeta(rec.related_metric).label}</span>
            <span>
              {baselineVal} → <span className={rec.outcome === 'success' ? 'text-success font-bold' : rec.outcome === 'fail' ? 'text-danger font-bold' : ''}>{actualVal}</span>
            </span>
            <span className="ml-auto opacity-60">{rec.created_at.slice(0, 10)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricGroupHeader({ metric, count, color, icon }: { metric: string; count: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider" style={{ color }}>
        {icon}
        {metric}
      </span>
      <span className="text-2xs text-text-muted bg-surface-solid px-1.5 py-0.5 rounded-full font-bold">{count}</span>
      <div className="h-px flex-1" style={{ backgroundColor: `${color}33` }} />
    </div>
  );
}

export function OracleStats({ evaluated }: { evaluated: OracleRecommendation[] }) {
  const successes = evaluated.filter((r) => r.outcome === 'success').length;
  const fails = evaluated.filter((r) => r.outcome === 'fail').length;
  const noData = evaluated.filter((r) => r.outcome === 'no_data').length;
  const totalEvaluated = successes + fails;
  const successRate = totalEvaluated > 0 ? Math.round((successes / totalEvaluated) * 100) : null;

  // Consecutive fail streak from most recent
  const recentByDate = [...evaluated].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  let streak = 0;
  for (const r of recentByDate) {
    if (r.outcome === 'fail') streak++;
    else break;
  }

  const rateColor =
    successRate === null ? 'text-text-muted' : successRate >= 50 ? 'text-success' : 'text-danger';

  return (
    <div className="space-y-3">
      {/* Success rate hero */}
      <div className="flex items-center justify-between bg-surface-2 dark:bg-on-accent/[0.015] border border-border-custom/50 rounded-2xl p-4">
        <div className="flex flex-col">
          <span className="text-xs font-black text-text-muted uppercase tracking-wider">Skuteczność</span>
          <span className="text-2xs text-text-muted mt-0.5">
            Na podstawie {totalEvaluated} rozstrzygnięć
          </span>
        </div>
        <span className={`text-2xl font-black ${rateColor}`}>
          {successRate !== null ? `${successRate}%` : '—'}
        </span>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-success/5 border border-success/10 rounded-xl p-2 flex flex-col gap-0.5">
          <span className="text-success font-black">{successes}</span>
          <span className="text-2xs text-text-muted font-bold uppercase tracking-wide">Sukcesy</span>
        </div>
        <div className="bg-danger/5 border border-danger/10 rounded-xl p-2 flex flex-col gap-0.5">
          <span className="text-danger font-black">{fails}</span>
          <span className="text-2xs text-text-muted font-bold uppercase tracking-wide">Błędy</span>
        </div>
        <div className="bg-surface-2/5 border border-border-custom rounded-xl p-2 flex flex-col gap-0.5">
          <span className="text-text-muted font-black">{noData}</span>
          <span className="text-2xs text-text-muted font-bold uppercase tracking-wide">Brak info</span>
        </div>
      </div>

      {/* Fail streak warning */}
      {streak >= 3 && (
        <div className="flex items-center gap-2 bg-warning/8 border border-warning/20 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <div>
            <p className="text-2xs font-black text-warning">{streak} porażek z rzędu</p>
            <p className="text-2xs text-text-muted">Wzorzec nieskutecznych zaleceń</p>
          </div>
        </div>
      )}

      {/* Trend per metric */}
      {Object.entries(METRIC_META).map(([key, meta]) => {
        const metricEvaluated = evaluated.filter((r) => r.related_metric === key && (r.outcome === 'success' || r.outcome === 'fail'));
        if (metricEvaluated.length === 0) return null;
        const metricSuccesses = metricEvaluated.filter((r) => r.outcome === 'success').length;
        const rate = Math.round((metricSuccesses / metricEvaluated.length) * 100);
        return (
          <div key={key} className="flex items-center gap-2 text-2xs">
            <span className="flex items-center gap-1 text-text-muted" style={{ color: meta.color }}>
              {meta.icon}
              {meta.label}
            </span>
            <div className="flex-1 h-1 rounded-full bg-surface-solid overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: meta.color }} />
            </div>
            <span className="text-text-muted font-bold">{rate}%</span>
            {rate < 30 && <TrendingDown size={10} className="text-danger" />}
          </div>
        );
      })}
    </div>
  );
}
