import React from 'react';
import { Card } from '../../../ui/Card';
import { cleanIntelText } from '../../desktopUtils';
import { BookOpen, Brain, Activity, User, Heart, Zap } from 'lucide-react';
import type { GeneralViewPattern, GeneralViewWiki } from '../hooks/useGeneralViewData';
import { confidenceWord, type PlainHypothesis } from './memexPlain';

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
          <div className="ml-auto h-1 w-16 rounded-full bg-surface-solid overflow-hidden shrink-0">
            <div className="h-full rounded-full" style={{ width: `${confPct}%`, backgroundColor: barColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatternCard({ p }: { p: GeneralViewPattern }) {
  return (
    <Card variant="outline" padding="0.75rem" className="space-y-1">
      <p className="text-xs font-bold leading-tight text-text-primary">{p.title || p.pattern_type}</p>
      {p.evidence_text && <p className="line-clamp-2 text-2xs leading-relaxed text-text-muted">{p.evidence_text}</p>}
    </Card>
  );
}

export function HypothesisCard({ h }: { h: PlainHypothesis }) {
  return (
    <Card variant="outline" padding="0.75rem" className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold leading-tight text-text-primary">{h.title}</p>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-2xs font-bold ${CONF_COLOR(h.confidence)}`}>
          {confidenceWord(h.confidence)}
        </span>
      </div>
      {h.detail && <p className="line-clamp-3 text-2xs leading-relaxed text-text-muted">{h.detail}</p>}
      {h.provocation && <p className="border-l-2 border-primary/30 pl-2 text-2xs italic text-primary">{h.provocation}</p>}
    </Card>
  );
}
