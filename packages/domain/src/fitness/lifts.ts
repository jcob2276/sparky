// Lift PR calculation
export function epley1rm(weight: number, reps: number): number | null {
  if (!weight || weight <= 0 || !reps || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function prDecayWeight(daysAgo: number): number {
  if (daysAgo < 0 || !Number.isFinite(daysAgo)) return 0;
  if (daysAgo <= 548) return 1; // ~18 months
  if (daysAgo >= 1095) return 0; // 3 years
  return Math.max(0, 1 - (daysAgo - 548) / (1095 - 548));
}

export type SessionLike = {
  date: string;
  exercise_logs?: Array<{
    exercise_name?: string | null;
    weight?: number | null;
    reps?: number | null;
    muscle_tags?: string[] | null;
  }> | null;
};

export interface DecayedLiftPR {
  label: string;
  kg: number;
  rawKg: number;
  date: string;
  daysAgo: number;
  decay: number;
}

const BENCH_PATTERNS = [/wycisk/i, /\bbench\b/i];
const SQUAT_PATTERNS = [/przysiad/i, /\bsquat\b/i, /leg press/i];
const DEAD_PATTERNS = [/martwy/i, /\bdeadlift\b/i, /\brdl\b/i, /rumun/i];

function isBenchName(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes('wąsk') || n.includes('wask') || n.includes('close-grip')) return false;
  if (n.includes('wycisk')) return true;
  return /\bbench\b/.test(n);
}

function matchesLift(name: string, patterns: RegExp[], kind?: 'bench'): boolean {
  const n = name.toLowerCase();
  if (n.includes('sauna') || n.includes('lodowata')) return false;
  if (kind === 'bench') return isBenchName(name);
  return patterns.some((p) => p.test(n));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function bestFromSessions(
  sessions: SessionLike[],
  patterns: RegExp[],
  label: string,
  today: string,
): DecayedLiftPR | null {
  let best: DecayedLiftPR | null = null;

  for (const session of sessions) {
    for (const log of session.exercise_logs ?? []) {
      const name = log.exercise_name || '';
      if (!matchesLift(name, patterns, label === 'wycisk' ? 'bench' : undefined)) continue;
      const w = Number(log.weight);
      const r = Number(log.reps);
      if (!w || w <= 0 || !r || r <= 0) continue;
      const est = r <= 5 ? w : (epley1rm(w, r) ?? w);
      const daysAgo = daysBetween(session.date, today);
      const decay = prDecayWeight(daysAgo);
      if (decay <= 0) continue;
      const effective = est * decay;
      if (!best || effective > best.kg) {
        best = { label, kg: effective, rawKg: est, date: session.date, daysAgo, decay };
      }
    }
  }
  return best;
}

export function extractLiftPRs(sessions: SessionLike[], today: string) {
  const nonWellness = sessions.filter(
    (s) => !(s.exercise_logs ?? []).every((l) => (l.muscle_tags ?? []).includes('wellness')),
  );
  return {
    bench: bestFromSessions(nonWellness, BENCH_PATTERNS, 'wycisk', today),
    squat: bestFromSessions(nonWellness, SQUAT_PATTERNS, 'przysiad', today),
    deadlift: bestFromSessions(nonWellness, DEAD_PATTERNS, 'martwy', today),
  };
}
