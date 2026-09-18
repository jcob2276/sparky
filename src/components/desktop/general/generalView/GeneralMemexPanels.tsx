import React from 'react';
import { Panel } from '../../shell/Panel';
import { Pressable } from '../../../ui/ControlPrimitives';
import { ChevronDown, ChevronUp, BookOpen, Brain, Lightbulb } from 'lucide-react';

import type { GeneralViewPattern, GeneralViewCuriosity, GeneralViewWiki } from '../hooks/useGeneralViewData';
import { WikiEntry, PatternCard, CuriosityCard, type TierLabel } from './GeneralMemexCards';

interface GeneralMemexPanelsProps {
  patterns: GeneralViewPattern[];
  curiosity: GeneralViewCuriosity[];
  wiki: GeneralViewWiki[];
  emeraldColor: string;
}

/** Evidence-weighted confidence score — hipotezy z 1 dowodem i 90% nie biją 10 dowodów i 80% */
function weightedScore(conf: number | null, evidence: number | null): number {
  const c = conf ?? 0;
  const n = evidence ?? 1;
  return c * Math.log(n + 1);
}

// eslint-disable-next-line max-lines-per-function
export default function GeneralMemexPanels({
  patterns,
  curiosity,
  wiki,
}: GeneralMemexPanelsProps) {
  const [showWeak, setShowWeak] = React.useState(false);

  // Deduplicate curiosity queue by canonical hypothesis key and sanitize provocation mismatches
  const deduplicatedCuriosity = React.useMemo(() => {
    const map = new Map<string, GeneralViewCuriosity>();
    for (const c of curiosity) {
      const key = (c.hypothesis || '').toLowerCase().trim();
      if (!key) continue;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...c });
      } else {
        const maxN = Math.max(existing.evidence_count ?? 0, c.evidence_count ?? 0);
        const bestConf = Math.max(existing.confidence_score ?? 0, c.confidence_score ?? 0);
        const bestProv = existing.provocation || c.provocation;
        map.set(key, {
          ...existing,
          evidence_count: maxN,
          confidence_score: bestConf,
          provocation: bestProv,
        });
      }
    }

    return Array.from(map.values()).map((c) => {
      const hypLower = c.hypothesis.toLowerCase();
      let provocation = c.provocation;
      // Sanitize mismatched provocation text (e.g. sleep waking text mistakenly placed on social hesitation)
      if (
        (hypLower.includes('social') || hypLower.includes('spoleczn')) &&
        provocation &&
        (provocation.includes('wstawanie') || provocation.includes('sen') || provocation.includes('wieczornych'))
      ) {
        provocation = 'Nawracające tarcie przed interakcjami społecznymi — czy wyznaczyć prosty pierwszy krok?';
      }
      return {
        ...c,
        provocation,
      };
    });
  }, [curiosity]);

  // Sort curiosity by evidence-weighted score
  const sortedCuriosity = React.useMemo(() => {
    return [...deduplicatedCuriosity].sort(
      (a, b) =>
        weightedScore(b.confidence_score, b.evidence_count) -
        weightedScore(a.confidence_score, a.evidence_count)
    );
  }, [deduplicatedCuriosity]);

  const strongCuriosity = sortedCuriosity.filter((c) => (c.confidence_score ?? 0) >= 0.8);

  // If there are no confirmed patterns, take the top candidate for the candidate panel,
  // and keep remaining for hypotheses to avoid displaying identical duplicates side-by-side
  const candidatePatterns = React.useMemo(() => {
    if (patterns.length > 0) return [];
    return strongCuriosity.slice(0, 2);
  }, [patterns.length, strongCuriosity]);

  const candidateHypothesisKeys = React.useMemo(() => {
    return new Set(candidatePatterns.map((c) => c.hypothesis.toLowerCase().trim()));
  }, [candidatePatterns]);

  // Distinct hypotheses for the right panel (excludes items already elevated to candidate status on the left)
  const displayHypotheses = React.useMemo(() => {
    if (patterns.length > 0) return sortedCuriosity;
    const remaining = sortedCuriosity.filter((c) => !candidateHypothesisKeys.has(c.hypothesis.toLowerCase().trim()));
    return remaining.length > 0 ? remaining : sortedCuriosity;
  }, [patterns.length, sortedCuriosity, candidateHypothesisKeys]);

  const strongHypotheses = displayHypotheses.filter((c) => (c.confidence_score ?? 0) >= 0.8);
  const mediumHypotheses = displayHypotheses.filter(
    (c) => (c.confidence_score ?? 0) >= 0.6 && (c.confidence_score ?? 0) < 0.8
  );
  const weakHypotheses = displayHypotheses.filter((c) => (c.confidence_score ?? 0) < 0.6);

  // Wiki sorted by freshness × confidence
  const sortedWiki = React.useMemo(() => {
    return [...wiki].sort((a, b) => {
      const scoreA = (a.confidence ?? 0) * (a.last_seen_at ? 1 : 0.5);
      const scoreB = (b.confidence ?? 0) * (b.last_seen_at ? 1 : 0.5);
      return scoreB - scoreA;
    });
  }, [wiki]);

  const STRONG: TierLabel = { label: 'Silna', className: 'bg-success/15 text-success border-success/25' };
  const MEDIUM: TierLabel = { label: 'Średnia', className: 'bg-warning/15 text-warning border-warning/25' };
  const WEAK: TierLabel = { label: 'Słaba', className: 'bg-surface-solid text-text-muted border-border-custom' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* ── Wzorce zachowań ── */}
        <Panel title={patterns.length > 0 ? `Wzorce zachowań (${patterns.length})` : `Wzorce zachowań — kandydaci (${candidatePatterns.length})`}>
          <div className="space-y-2 max-h-[var(--ds-h-280px)] overflow-y-auto pr-1">
            {patterns.length > 0
              ? patterns.map((p, i) => <PatternCard key={i} p={p} />)
              : candidatePatterns.length > 0
                ? (
                  <>
                    <p className="text-2xs text-text-muted mb-2 pb-2 border-b border-border-custom/40">
                      Brak potwierdzonych wzorców — poniżej top kandydaci do walidacji (conf ≥ 80%)
                    </p>
                    {candidatePatterns.map((c, i) => (
                      <CuriosityCard key={i} c={c} tier={STRONG} />
                    ))}
                  </>
                )
                : (
                  <div className="text-center py-6 text-text-muted text-xs border border-dashed border-border-custom/40 rounded-xl">
                    <Brain size={20} className="mx-auto mb-2 opacity-40" />
                    Brak wzorców — system generuje je stopniowo z danych streamu
                  </div>
                )}
          </div>
        </Panel>

        {/* ── Hipotezy do zbadania ── */}
        <Panel title={`Hipotezy do zbadania (${displayHypotheses.length})`}>
          <div className="space-y-2 max-h-[var(--ds-h-280px)] overflow-y-auto pr-1">
            {/* Strong */}
            {strongHypotheses.map((c, i) => (
              <CuriosityCard key={`s${i}`} c={c} tier={STRONG} />
            ))}

            {/* Medium */}
            {mediumHypotheses.length > 0 && (
              <>
                {strongHypotheses.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-border-custom/40" />
                    <span className="text-2xs text-text-muted font-bold uppercase tracking-wider">Średnie</span>
                    <div className="h-px flex-1 bg-border-custom/40" />
                  </div>
                )}
                {mediumHypotheses.map((c, i) => (
                  <CuriosityCard key={`m${i}`} c={c} tier={MEDIUM} />
                ))}
              </>
            )}

            {/* Weak — collapsed by default */}
            {weakHypotheses.length > 0 && (
              <>
                <Pressable
                  onClick={() => setShowWeak((v) => !v)}
                  className="w-full flex items-center gap-2 py-1.5 text-2xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  <div className="h-px flex-1 bg-border-custom/30" />
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                    {showWeak ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    Mniej pewne ({weakHypotheses.length})
                  </span>
                  <div className="h-px flex-1 bg-border-custom/30" />
                </Pressable>
                {showWeak &&
                  weakHypotheses.map((c, i) => (
                    <CuriosityCard key={`w${i}`} c={c} tier={WEAK} />
                  ))}
              </>
            )}

            {displayHypotheses.length === 0 && (
              <div className="text-center py-6 text-text-muted text-xs border border-dashed border-border-custom/40 rounded-xl">
                <Lightbulb size={20} className="mx-auto mb-2 opacity-40" />
                Brak hipotez — system generuje je stopniowo
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Wiki — strony pamięci ── */}
      <Panel title={`Wiki — strony pamięci (${wiki.length})`}>
        <div className="max-h-[var(--ds-h-260px)] overflow-y-auto pr-1">
          {sortedWiki.map((w, i) => (
            <WikiEntry key={i} w={w} />
          ))}
          {wiki.length === 0 && (
            <div className="text-center py-6 text-text-muted text-xs border border-dashed border-border-custom/40 rounded-xl">
              <BookOpen size={20} className="mx-auto mb-2 opacity-40" />
              Brak stron wiki
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
