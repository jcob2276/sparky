import { CALL_PHASE_LABELS, type CallPhase } from '@vanguard/domain';
import type { CloserCallSummary } from './closerCallsApi';
import { reviewMoments } from './closerCallReview';

type PatternCall = Pick<CloserCallSummary, 'id' | 'title' | 'started_at' | 'ai_mistakes' | 'ai_good_moves'>;

interface PhasePattern {
  phase: CallPhase;
  label: string;
  /** W ilu rozmowach etap ma moment „do przećwiczenia”. */
  calls: number;
  /** Najnowszy eksperyment z tego etapu i rozmowa, z której pochodzi. */
  latest: { callId: string; title: string; experiment: string } | null;
}

export interface CallPatterns {
  /** Rozmowy, których analiza ma etapy (nowy format). */
  analyzed: number;
  practice: PhasePattern[];
  strength: PhasePattern | null;
}

const MIN_CALLS = 2;

/** Etapy rozmowy, które powtarzają się między nagraniami: najczęstsze do przećwiczenia i najczęstsza mocna strona. */
export function callPatterns(calls: PatternCall[], limit = 3): CallPatterns {
  const newestFirst = [...calls].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const tally = { practice: new Map<CallPhase, PhasePattern>(), repeat: new Map<CallPhase, PhasePattern>() };
  let analyzed = 0;
  for (const call of newestFirst) {
    const moments = reviewMoments(call).filter(moment => moment.phase !== null);
    if (moments.length) analyzed += 1;
    for (const kind of ['practice', 'repeat'] as const) {
      const seen = new Set<CallPhase>();
      for (const moment of moments.filter(m => m.kind === kind)) {
        const phase = moment.phase as CallPhase;
        const pattern = tally[kind].get(phase) ?? { phase, label: CALL_PHASE_LABELS[phase], calls: 0, latest: null };
        if (!seen.has(phase)) { pattern.calls += 1; seen.add(phase); }
        if (!pattern.latest && moment.experiment) pattern.latest = { callId: call.id, title: call.title, experiment: moment.experiment };
        tally[kind].set(phase, pattern);
      }
    }
  }
  const ranked = (map: Map<CallPhase, PhasePattern>) =>
    [...map.values()].filter(p => p.calls >= MIN_CALLS).sort((a, b) => b.calls - a.calls);
  return { analyzed, practice: ranked(tally.practice).slice(0, limit), strength: ranked(tally.repeat)[0] ?? null };
}
