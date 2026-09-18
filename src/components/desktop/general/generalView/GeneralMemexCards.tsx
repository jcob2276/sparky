import React from 'react';
import { Card } from '../../../ui/Card';
import { cleanIntelText } from '../../desktopUtils';
import { BookOpen, Brain, Activity, User, Heart, Zap } from 'lucide-react';
import type { GeneralViewPattern, GeneralViewCuriosity, GeneralViewWiki } from '../hooks/useGeneralViewData';

export interface TierLabel {
  label: string;
  className: string;
}

const PAGE_TYPE_ICONS: Record<string, React.ReactNode> = {
  training: <Activity size={12} />,
  health: <Heart size={12} />,
  behavior_pattern: <Brain size={12} />,
  identity: <User size={12} />,
  decision: <Zap size={12} />,
  friction_loop: <Zap size={12} />,
  source_summary: <BookOpen size={12} />,
  operating_model: <Activity size={12} />,
};

const CONF_COLOR = (conf: number) =>
  conf >= 0.8
    ? 'bg-success/15 text-success border-success/25'
    : conf >= 0.6
      ? 'bg-warning/15 text-warning border-warning/25'
      : 'bg-surface-solid text-text-muted border-border-custom';

export function WikiEntry({ w }: { w: GeneralViewWiki }) {
  const conf = w.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const icon = PAGE_TYPE_ICONS[w.page_type] ?? <BookOpen size={12} />;
  const barColor =
    conf >= 0.8 ? 'var(--color-success)' : conf >= 0.6 ? 'var(--color-warning)' : 'var(--color-text-muted)';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-custom/40 last:border-0">
      <div
        className="mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-text-muted"
        style={{ background: 'var(--color-surface-solid)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-text-primary truncate">{w.title}</span>
          <span className={`shrink-0 text-2xs px-1.5 py-0.5 rounded-full border font-bold ${CONF_COLOR(conf)}`}>
            {confPct}%
          </span>
        </div>
        {w.summary && (
          <p className="text-2xs text-text-muted leading-relaxed line-clamp-2">
            {cleanIntelText(w.summary, 180)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xs px-1 py-0.5 rounded bg-surface-solid text-text-muted font-medium">
            {w.page_type.replace(/_/g, ' ')}
          </span>
          {w.tags?.slice(0, 2).map((t) => (
            <span key={t} className="text-2xs text-text-muted opacity-60">
              #{t}
            </span>
          ))}
          <div className="ml-auto h-1 w-16 rounded-full bg-surface-solid overflow-hidden shrink-0">
            <div className="h-full rounded-full" style={{ width: `${confPct}%`, backgroundColor: barColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatternCard({ p }: { p: GeneralViewPattern }) {
  const conf = p.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  return (
    <Card variant="outline" padding="0.75rem" className="hover:border-primary/20 hover:shadow-sm ui-interactive duration-[var(--motion-medium)]">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-text-primary leading-tight">{p.title || p.pattern_type}</span>
        <span className={`text-2xs px-1.5 py-0.5 rounded-full border font-bold shrink-0 ${p.status === 'active' ? 'bg-success/15 text-success border-success/25' : 'bg-warning/15 text-warning border-warning/25'}`}>
          {p.status}
        </span>
      </div>
      {p.evidence_text && (
        <p className="text-2xs text-text-muted leading-relaxed mb-2 line-clamp-2">{p.evidence_text}</p>
      )}
      <div className="flex gap-3 text-2xs text-text-muted items-center">
        <span>n={p.occurrence_count}</span>
        <span className={`px-1.5 py-0.5 rounded-full border font-bold ${CONF_COLOR(conf)}`}>
          conf {confPct}%
        </span>
        <span className="ml-auto opacity-60">{p.last_seen?.slice(0, 10)}</span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-surface-solid overflow-hidden">
        <div
          className="h-full rounded-full ui-interactive"
          style={{ width: `${confPct}%`, backgroundColor: conf >= 0.8 ? 'var(--color-success)' : 'var(--color-warning)' }}
        />
      </div>
    </Card>
  );
}

export function CuriosityCard({ c, tier }: { c: GeneralViewCuriosity; tier: TierLabel }) {
  const confPct = Math.round((c.confidence_score ?? 0) * 100);
  return (
    <Card variant="outline" padding="0.75rem" className="hover:border-primary/20 hover:shadow-sm ui-interactive duration-[var(--motion-medium)]">
      <div className="flex items-start gap-2 mb-1.5">
        <span className={`shrink-0 text-2xs px-1.5 py-0.5 rounded-full border font-bold mt-0.5 ${tier.className}`}>
          {tier.label}
        </span>
        <p className="text-xs text-text-primary leading-relaxed font-semibold">{c.hypothesis}</p>
      </div>
      {c.provocation && (
        <p className="text-2xs text-primary italic mb-1.5 pl-1 border-l-2 border-primary/30">→ {c.provocation}</p>
      )}
      <div className="flex flex-wrap gap-2 text-2xs text-text-muted mt-1 items-center">
        {c.category && (
          <span className="px-1.5 py-0.5 rounded bg-surface-solid font-medium">{c.category.replace(/_/g, ' ')}</span>
        )}
        <span>n={c.evidence_count ?? 0}</span>
        <span className={`ml-auto px-1.5 py-0.5 rounded-full border font-bold ${CONF_COLOR(c.confidence_score ?? 0)}`}>
          {confPct}%
        </span>
      </div>
    </Card>
  );
}
