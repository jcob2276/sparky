import { CALL_PHASES, CALL_PHASE_LABELS, type CallPhase, type PhaseAssessment, type PhaseCriterion } from '@vanguard/domain';
import type { CloserCallSummary } from './closerCallsApi';
import { windowTrend } from './closerTrendMath';

type TrendCall = Pick<CloserCallSummary, 'started_at' | 'ai_phases' | 'ai_call_kind'>;

interface PhaseTrend {
  phase: CallPhase;
  label: string;
  /** Rozmowy sprzedażowe, w których etap został oceniony. */
  calls: number;
  /** Średnia z ostatnich rozmów (okno WINDOW) albo null przy za małej próbie. */
  recent: number | null;
  /** Zmiana względem poprzedniego okna albo null, gdy poprzednie okno jest za małe. */
  delta: number | null;
}

interface CriterionStat {
  id: string;
  label: string;
  phaseLabel: string;
  calls: number;
}

export interface PhaseReport {
  salesCalls: number;
  trends: PhaseTrend[];
  /** Najniżej oceniany etap i jego najczęściej brakujące kryterium. */
  fix: { trend: PhaseTrend; missed: CriterionStat | null } | null;
  /** Kryteria brakujące w co najmniej MIN_REPEAT rozmowach. */
  repeating: CriterionStat[];
  /** Kryteria spełniane prawie zawsze (do zachowania). */
  working: CriterionStat[];
}

const MIN_REPEAT = 3;
const WORKING_SHARE = 0.8;

const isCriterion = (value: unknown): value is PhaseCriterion =>
  !!value && typeof value === 'object' && typeof (value as PhaseCriterion).id === 'string' && typeof (value as PhaseCriterion).label === 'string';

/** Bezpiecznie czyta `ai_phases` (JSONB); wpisy w złym kształcie są pomijane. */
function parsePhaseAssessments(value: unknown): PhaseAssessment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): PhaseAssessment[] => {
    const m = (item ?? {}) as Record<string, unknown>;
    const phase = CALL_PHASES.find(p => p === m.phase);
    if (!phase || typeof m.score !== 'number') return [];
    const list = (raw: unknown) => (Array.isArray(raw) ? raw.filter(isCriterion) : []);
    return [{ phase, score: m.score, met: list(m.met), missed: list(m.missed), evidence: typeof m.evidence === 'string' ? m.evidence : null }];
  });
}

/** Trendy etapów rozmów sprzedażowych: średnia z 5 ostatnich vs 5 poprzednich, co poprawić, co się powtarza i co działa. */
export function phaseReport(calls: TrendCall[]): PhaseReport {
  const sales = calls.filter(call => call.ai_call_kind === 'sales')
    .map(call => ({ at: call.started_at, phases: parsePhaseAssessments(call.ai_phases) }))
    .filter(call => call.phases.length > 0)
    .sort((a, b) => b.at.localeCompare(a.at));

  const trends = CALL_PHASES.map((phase): PhaseTrend => {
    const scores = sales.flatMap(call => call.phases.filter(p => p.phase === phase).map(p => p.score));
    const { recent: recentAvg, delta } = windowTrend(scores);
    return { phase, label: CALL_PHASE_LABELS[phase], calls: scores.length, recent: recentAvg, delta };
  });

  const missedBy = new Map<string, CriterionStat>();
  const metBy = new Map<string, CriterionStat>();
  for (const call of sales) {
    for (const assessment of call.phases) {
      const phaseLabel = CALL_PHASE_LABELS[assessment.phase];
      const bump = (map: Map<string, CriterionStat>, criterion: PhaseCriterion) => {
        const stat = map.get(criterion.id) ?? { id: criterion.id, label: criterion.label, phaseLabel, calls: 0 };
        stat.calls += 1;
        map.set(criterion.id, stat);
      };
      assessment.missed.forEach(criterion => bump(missedBy, criterion));
      assessment.met.forEach(criterion => bump(metBy, criterion));
    }
  }

  const rankedMissed = [...missedBy.values()].sort((a, b) => b.calls - a.calls);
  const lowest = trends.filter(t => t.recent !== null).sort((a, b) => (a.recent as number) - (b.recent as number))[0];
  const fix = lowest ? { trend: lowest, missed: rankedMissed.find(stat => stat.id.startsWith(lowest.phase + '.')) ?? null } : null;
  const working = [...metBy.values()].filter(stat => {
    const checked = stat.calls + (missedBy.get(stat.id)?.calls ?? 0);
    return checked >= 5 && stat.calls / checked >= WORKING_SHARE;
  }).sort((a, b) => b.calls - a.calls).slice(0, 3);

  return { salesCalls: sales.length, trends, fix, repeating: rankedMissed.filter(stat => stat.calls >= MIN_REPEAT).slice(0, 5), working };
}
