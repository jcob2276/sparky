import React from 'react';
import { Panel } from '../../shell/Panel';
import { Pressable } from '../../../ui/ControlPrimitives';
import { ChevronDown, ChevronUp, BookOpen, Brain } from 'lucide-react';

import type { GeneralViewPattern, GeneralViewCuriosity, GeneralViewWiki } from '../hooks/useGeneralViewData';
import { WikiEntry, PatternCard, HypothesisCard } from './GeneralMemexCards';
import { groupHypotheses } from './memexPlain';
import CoreMemoryHistory from '../../../memory/CoreMemoryHistory';

interface GeneralMemexPanelsProps {
  userId: string;
  patterns: GeneralViewPattern[];
  curiosity: GeneralViewCuriosity[];
  wiki: GeneralViewWiki[];
}

const VISIBLE_HYPOTHESES = 3;

/** Pamięć Sparky: obserwacje, hipotezy i syntezy ze źródłami. */
export default function GeneralMemexPanels({ userId, patterns, curiosity, wiki }: GeneralMemexPanelsProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [showWiki, setShowWiki] = React.useState(false);

  const hypotheses = React.useMemo(() => groupHypotheses(curiosity), [curiosity]);
  const shown = showAll ? hypotheses : hypotheses.slice(0, VISIBLE_HYPOTHESES);
  const hidden = hypotheses.length - VISIBLE_HYPOTHESES;

  return (
    <div className="space-y-5">
      <CoreMemoryHistory key={userId} userId={userId} />
      {patterns.length > 0 && (
        <Panel title={`Powtarzające się obserwacje (${patterns.length})`}>
          <div className="space-y-2">{patterns.map((p, i) => <PatternCard key={i} p={p} />)}</div>
        </Panel>
      )}

      <Panel title="Co system zauważył u Ciebie">
        <div className="space-y-2">
          {shown.map((h) => <HypothesisCard key={h.key} h={h} />)}
          {hypotheses.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-custom/40 py-6 text-center text-xs text-text-muted">
              <Brain size={20} className="mx-auto mb-2 opacity-40" />
              Za mało danych — wzorce pojawią się z czasem.
            </div>
          )}
          {hidden > 0 && (
            <Pressable
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 py-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted hover:text-text-secondary"
            >
              {showAll ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {showAll ? 'Mniej' : `Jeszcze ${hidden}`}
            </Pressable>
          )}
        </div>
      </Panel>

      {wiki.length > 0 && (
        <Panel
          title={`Syntezy pamięci Sparky (${wiki.length})`}
          action={
            <Pressable onClick={() => setShowWiki((v) => !v)} className="text-2xs font-semibold text-primary">
              {showWiki ? 'Zwiń' : 'Pokaż'}
            </Pressable>
          }
        >
          {showWiki ? (
            <div className="space-y-2">
              {wiki.map((w) => <WikiEntry key={w.id} w={w} userId={userId} />)}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-text-muted"><BookOpen size={12} /> Rozwiń, żeby zobaczyć listę.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
