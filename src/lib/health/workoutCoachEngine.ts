/**
 * @file workoutCoachEngine.ts
 * @role Architektura AI Coacha adaptowana z forka alexpcosta/opengym:
 * - Discrete Change-Sets: atomowe, audytowalne zmiany w planie z polem `why` opartym na dowodach
 * - Plan Snapshot & Revert: bezpieczne migawkowanie planu i 1-tap cofanie korekt
 * - Minimalizacja payloadu: przekazywanie do LLM wyłącznie zanonimizowanego okna dowodowego
 */

export type CoachChangeType =
  | 'add_exercise'
  | 'remove_exercise'
  | 'swap_exercise'
  | 'change_sets'
  | 'change_reps'
  | 'change_policy'
  | 'change_schedule';

export interface DiscreteChange {
  id: string;
  type: CoachChangeType;
  target: {
    routineId?: string;
    routineName?: string;
    exerciseName?: string;
    weekday?: number;
  };
  before?: unknown;
  after: unknown;
  why: string; // Twardy cytat z danych (np. "Stall 3x z rzędu przy RPE >= 9.5")
  approved?: boolean;
}

export interface CoachProposal {
  id: string;
  createdAt: string;
  summary: string;
  evidenceWindowSessions: number;
  changes: DiscreteChange[];
  coachNotes?: string[];
  planSnapshotId?: string;
}

export interface PlanSnapshot<T = unknown> {
  id: string;
  timestamp: number;
  label: string;
  planData: T;
}

export interface CoachIntakeProfile {
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'general_fitness';
  experience: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  sessionDurationMin: number;
  equipment: string[];
  limitations?: string;
  preferences?: string;
}

/**
 * Tworzy migawkę planu przed zaaplikowaniem zmian AI.
 */
export function createPlanSnapshot<T>(planData: T, label: string): PlanSnapshot<T> {
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    label,
    planData: JSON.parse(JSON.stringify(planData)),
  };
}

/**
 * Przywraca stan z wybranej migawki.
 */
export function restorePlanSnapshot<T>(
  snapshots: PlanSnapshot<T>[],
  snapshotId: string
): T | null {
  const target = snapshots.find((s) => s.id === snapshotId);
  if (!target) return null;
  return JSON.parse(JSON.stringify(target.planData));
}

/**
 * Aplikuje tylko te zmiany z propozycji, które zostały zatwierdzone przez użytkownika.
 */
export function applyApprovedChanges<
  TRoutine extends { id: string; name: string; exercises: Array<{ name: string; sets: number; reps: number; [key: string]: unknown }> }
>(
  currentRoutines: TRoutine[],
  changes: DiscreteChange[],
  approvedChangeIds: string[]
): { updatedRoutines: TRoutine[]; appliedCount: number } {
  const approvedSet = new Set(approvedChangeIds);
  const routinesCopy: TRoutine[] = JSON.parse(JSON.stringify(currentRoutines));
  let appliedCount = 0;

  for (const change of changes) {
    if (!approvedSet.has(change.id)) continue;

    const routine = routinesCopy.find(
      (r) => (change.target.routineId && r.id === change.target.routineId) ||
             (change.target.routineName && r.name.toLowerCase() === change.target.routineName.toLowerCase())
    );

    if (!routine) continue;

    switch (change.type) {
      case 'swap_exercise': {
        const ex = routine.exercises.find(
          (e) => e.name.toLowerCase() === (change.target.exerciseName || '').toLowerCase()
        );
        const afterEx = change.after as { name?: string; sets?: number; reps?: number } | null | undefined;
        if (ex && afterEx?.name) {
          ex.name = afterEx.name;
          if (afterEx.sets) ex.sets = afterEx.sets;
          if (afterEx.reps) ex.reps = afterEx.reps;
          appliedCount++;
        }
        break;
      }
      case 'change_sets': {
        const ex = routine.exercises.find(
          (e) => e.name.toLowerCase() === (change.target.exerciseName || '').toLowerCase()
        );
        if (ex && typeof change.after === 'number') {
          ex.sets = change.after;
          appliedCount++;
        }
        break;
      }
      case 'change_reps': {
        const ex = routine.exercises.find(
          (e) => e.name.toLowerCase() === (change.target.exerciseName || '').toLowerCase()
        );
        if (ex && typeof change.after === 'number') {
          ex.reps = change.after;
          appliedCount++;
        }
        break;
      }
      case 'add_exercise': {
        const afterEx = change.after as { name?: string; sets?: number; reps?: number } | null | undefined;
        if (afterEx?.name) {
          routine.exercises.push({
            name: afterEx.name,
            sets: afterEx.sets || 3,
            reps: afterEx.reps || 10,
          });
          appliedCount++;
        }
        break;
      }
      case 'remove_exercise': {
        const idx = routine.exercises.findIndex(
          (e) => e.name.toLowerCase() === (change.target.exerciseName || '').toLowerCase()
        );
        if (idx >= 0) {
          routine.exercises.splice(idx, 1);
          appliedCount++;
        }
        break;
      }
    }
  }

  return { updatedRoutines: routinesCopy, appliedCount };
}

/**
 * Buduje zwięzły, zanonimizowany kontekst dowodowy dla modelu LLM (Sparky Oracle / DeepSeek).
 * Zgodnie z zasadą minimalizacji danych: zero kluczy, zero ID użytkownika, tylko twarde metryki.
 */
export function buildCoachEvidencePayload(
  recentSessions: Array<{
    date: string;
    exercises: Array<{
      name: string;
      sets: Array<{ weightKg: number; reps: number; rir?: number | null; rpe?: number | null; done?: boolean }>;
    }>;
  }>,
  intake?: CoachIntakeProfile
) {
  const exerciseSummaries: Record<string, { totalSessions: number; avgRir: number | null; maxWeight: number; stalls: number }> = {};

  for (const session of recentSessions) {
    for (const ex of session.exercises) {
      if (!exerciseSummaries[ex.name]) {
        exerciseSummaries[ex.name] = { totalSessions: 0, avgRir: null, maxWeight: 0, stalls: 0 };
      }
      const summary = exerciseSummaries[ex.name];
      summary.totalSessions++;

      const validSets = ex.sets.filter((s) => s.done !== false);
      for (const s of validSets) {
        if (s.weightKg > summary.maxWeight) summary.maxWeight = s.weightKg;
      }

      const rirList = validSets.map((s) => s.rir).filter((r): r is number => r !== null && r !== undefined);
      if (rirList.length) {
        const avg = rirList.reduce((a, b) => a + b, 0) / rirList.length;
        summary.avgRir = summary.avgRir === null ? avg : (summary.avgRir + avg) / 2;
      }
    }
  }

  return {
    sessionsAnalyzed: recentSessions.length,
    dateRange: {
      from: recentSessions[0]?.date || null,
      to: recentSessions[recentSessions.length - 1]?.date || null,
    },
    goalsAndConstraints: intake || null,
    exercises: exerciseSummaries,
  };
}
