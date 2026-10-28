import React from 'react';
import { Card } from '../../../ui/Card';
import { cleanIntelText } from '../../desktopUtils';
import { BookOpen, Brain, Activity, User, Heart, Zap } from 'lucide-react';
import type { GeneralViewPattern, GeneralViewWiki } from '../hooks/useGeneralViewData';
import { confidenceWord, type PlainHypothesis } from './memexPlain';
import { Pressable } from '../../../ui/ControlPrimitives';
import { formatMemorySourceDate } from '../../../../lib/memorySourcesApi';
import WikiSources from './WikiSources';

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

export function WikiEntry({ w, userId }: { w: GeneralViewWiki; userId: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const conf = w.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const icon = PAGE_TYPE_ICONS[w.page_type] ?? <BookOpen size={12} />;
  const status = w.status === 'user_confirmed' ? 'Potwierdzone przez Ciebie'
    : w.status === 'needs_review' ? 'Wymaga oceny' : w.status === 'hypothesis' ? 'Hipoteza' : 'Wniosek systemu';

  return (
    <div className="space-y-3 border-b border-border-custom/40 py-3 last:border-0">
      <Pressable onClick={() => setExpanded(value => !value)} aria-expanded={expanded}
        aria-controls={`wiki-${w.id}`} className="flex w-full items-start gap-2 text-left">
        <span className="mt-0.5 shrink-0 text-text-muted">{icon}</span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block break-words text-xs font-bold text-text-primary">{w.title}</span>
          {w.summary ? <span className="block text-2xs leading-relaxed text-text-muted">{cleanIntelText(w.summary, 180)}</span> : null}
          <span className="inline-block rounded-full border border-border-custom px-1.5 py-0.5 text-2xs text-text-muted">{status}</span>
          <span className="block text-2xs font-semibold text-primary">{expanded ? 'Zwiń' : 'Teza i źródła'}</span>
        </span>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-2xs font-bold ${CONF_COLOR(conf)}`}>
          {w.confidence === null ? 'Brak oceny' : `${confPct}%`}
        </span>
      </Pressable>
      {expanded ? <section id={`wiki-${w.id}`} className="space-y-3 pl-5">
        <p className="text-2xs text-text-muted">
          Kompilacja: {formatMemorySourceDate(w.last_compiled_at)}
        </p>
        <div className="space-y-2 text-xs leading-relaxed text-text-secondary">
          {(w.content_md || w.summary || 'Brak rozwinięcia tezy.').split('\n\n').map((part, index) => (
            <p key={index} className="whitespace-pre-wrap break-words">{part}</p>
          ))}
        </div>
        <WikiSources userId={userId} pageId={w.id} legacyRefs={w.source_refs} />
      </section> : null}
    </div>
  );
}

export function PatternCard({ p }: { p: GeneralViewPattern }) {
  return (
    <Card variant="outline" padding="0.75rem" className="space-y-1">
      <p className="text-xs font-bold leading-tight text-text-primary">{p.title || p.pattern_type}</p>
      <span className="inline-block rounded-full border border-border-custom px-1.5 py-0.5 text-2xs text-text-muted">
        {p.status === 'user_confirmed' ? 'Potwierdzone przez Ciebie' : p.status === 'candidate' ? 'Wymaga oceny' : 'Obserwacja systemu'}
      </span>
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
