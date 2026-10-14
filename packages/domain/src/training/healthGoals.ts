export type HealthGoalKind = 'run_10k' | 'body_fat' | 'pull_up' | 'muscle_up' | 'bench' | 'posture';
export const HEALTH_GOAL_STANDARDS: Record<HealthGoalKind, string[]> = {
  run_10k: ['elapsed_time'], body_fat: ['same_method'], pull_up: ['strict_full_rom'],
  muscle_up: ['strict_full_rom', 'controlled_kipping'], bench: ['full_rom', 'paused_full_rom'], posture: ['comfortable_upright'],
};
export const HEALTH_GOAL_VARIANTS: Record<HealthGoalKind, string[]> = {
  run_10k: ['road', 'track', 'treadmill'], body_fat: ['dexa', 'bia', 'skinfold', 'tape'],
  pull_up: ['pronated', 'neutral', 'supinated'], muscle_up: ['bar', 'rings'],
  bench: ['barbell', 'paused_barbell'], posture: ['user'],
};
export interface HealthGoalSpec {
  kind: HealthGoalKind;
  variant: string | null;
  standard: string | null;
  priority: number;
  reserveReps: number | null;
}
export interface HealthGoal {
  id?: string;
  revision: number;
  name: string;
  unit: string;
  target: number;
  higherIsBetter: boolean;
  spec: HealthGoalSpec;
}
export interface TrainingConstraints {
  revision: number;
  availability: Array<{ day: number; minutes: number }>;
  equipment: string[];
  limitations: string[];
  avoidExercises?: string[];
  painReported?: boolean;
}
export interface HealthGoalResult {
  value: number;
  unit: string;
  variant: string;
  standard: string;
  source: 'measured' | 'estimated' | 'self_reported';
  techniqueConfirmed?: boolean;
  reserveReps?: number | null;
}
const preset = (kind: HealthGoalKind, name: string, target: number, unit: string, higherIsBetter: boolean): HealthGoal => ({
  name, target, unit, higherIsBetter, revision: 0,
  spec: { kind, variant: null, standard: null, priority: 1, reserveReps: null },
});
/** Suggestions only. Saving requires an explicit user action; unknown standards remain unknown. */
export const HEALTH_GOAL_PRESETS: HealthGoal[] = [
  preset('run_10k', 'Bieg na 10 km', 2700, 'seconds', false),
  preset('body_fat', 'Poziom tkanki tłuszczowej', 13, 'percent', false),
  preset('pull_up', 'Poprawne podciągnięcia', 10, 'reps', true),
  preset('muscle_up', 'Poprawny muscle-up', 1, 'reps', true),
  preset('bench', 'Wyciskanie sztangi z zapasem', 100, 'kg', true),
  preset('posture', 'Swobodna, wyprostowana postawa', 1, 'confirmed', true),
];

export function assessHealthGoal(goal: HealthGoal, result: HealthGoalResult | null): {
  state: 'unknown' | 'in_progress' | 'achieved'; reason: string;
} {
  const unknown = (reason: string) => ({ state: 'unknown' as const, reason });
  if (!result) return unknown('Brak wyniku według ustalonego standardu.');
  if (!goal.spec.variant || !goal.spec.standard) return unknown('Najpierw potwierdź wariant i kryterium celu.');
  if (!HEALTH_GOAL_STANDARDS[goal.spec.kind].includes(goal.spec.standard) || !HEALTH_GOAL_VARIANTS[goal.spec.kind].includes(goal.spec.variant)) return unknown('Nieznany standard lub wariant celu.');
  if (!Number.isFinite(result.value) || result.unit !== goal.unit) return unknown('Inna jednostka lub brak liczby.');
  if (goal.spec.variant !== result.variant || goal.spec.standard !== result.standard) return unknown('Wynik pochodzi z innego wariantu lub standardu.');
  if (goal.spec.kind === 'posture') {
    if (result.source !== 'self_reported') return unknown('Odczucie postawy potwierdza użytkownik.');
  } else if (result.source !== 'measured') return unknown('Szacunek nie potwierdza wykonania celu.');
  if (['bench', 'pull_up', 'muscle_up'].includes(goal.spec.kind) && result.techniqueConfirmed !== true) return unknown('Brak potwierdzenia standardu wykonania.');
  if (goal.spec.kind === 'bench' && (goal.spec.reserveReps == null || result.reserveReps == null)) return unknown('Zapas powtórzeń wymaga osobnego potwierdzenia.');
  const achieved = (goal.higherIsBetter ? result.value >= goal.target : result.value <= goal.target)
    && (goal.spec.kind !== 'bench' || result.reserveReps! >= goal.spec.reserveReps!);
  return { state: achieved ? 'achieved' : 'in_progress', reason: achieved ? 'Wynik spełnia zadeklarowany standard.' : 'Wynik zapisany; cel pozostaje w toku.' };
}

export function validateTrainingConstraints(input: TrainingConstraints): string[] {
  const errors: string[] = [];
  if (!input.availability.length) errors.push('Wybierz co najmniej jeden dostępny dzień.');
  const days = new Set<number>();
  for (const slot of input.availability) {
    if (!Number.isInteger(slot.day) || slot.day < 1 || slot.day > 7 || days.has(slot.day)) errors.push('Dni tygodnia muszą być unikalne, od 1 do 7.');
    if (!Number.isFinite(slot.minutes) || slot.minutes < 10 || slot.minutes > 240) errors.push('Czas sesji: od 10 do 240 minut.');
    days.add(slot.day);
  }
  if (input.equipment.some(item => !item.trim()) || input.equipment.length > 30) errors.push('Sprawdź listę sprzętu.');
  if (input.limitations.some(item => !item.trim()) || input.limitations.length > 20) errors.push('Sprawdź ograniczenia.');
  return [...new Set(errors)];
}
