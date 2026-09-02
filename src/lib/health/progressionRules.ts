/**
 * Reguły progresji ciężaru — edytuj pod swój sposób trenowania.
 * Aplikacja nie dobiera ćwiczeń; tylko klasyfikuje ruch i stosuje increment.
 */
export type MovementIncrement = 'barbell_small' | 'barbell_large' | 'machine' | 'dumbbell';

export const PROGRESSION_RULES = {
  /** Średni RIR z ostatniej sesji ≥ ten próg → możliwa progresja */
  targetRirMin: 1,
  increments: {
    barbell_small: 2.5,
    barbell_large: 5,
    machine: 2.5,
    dumbbell: 2.5,
  },
} as const;

/** Kolejność ma znaczenie — pierwsze dopasowanie wygrywa. */
const MOVEMENT_PATTERNS: Array<{ type: MovementIncrement; re: RegExp }> = [
  { type: 'barbell_large', re: /martwy|deadlift|przysiad|squat|leg press|hack/i },
  { type: 'dumbbell', re: /hantl|dumbbell|młotk|hammer|jednor/i },
  { type: 'barbell_small', re: /wycisk|bench|wiosł|wiosl|row|ohp|sztang|rdl|podciąg|podciag/i },
  { type: 'machine', re: /lat pulldown|ściąg|sciag|wyciąg|cable|maszyn|leg curl|leg ext/i },
];

export function classifyMovement(exerciseName: string, muscleTags: string[] = []): MovementIncrement {
  const n = exerciseName.trim();
  for (const { type, re } of MOVEMENT_PATTERNS) {
    if (re.test(n)) return type;
  }
  const tagStr = muscleTags.join(' ').toLowerCase();
  if (/quad|poślad|dwugł|glute|hamstring/i.test(tagStr)) return 'barbell_large';
  if (/biceps|triceps|barki|shoulder/i.test(tagStr) && /hantl/i.test(n)) return 'dumbbell';
  return 'machine';
}

export function incrementKg(movement: MovementIncrement): number {
  return PROGRESSION_RULES.increments[movement];
}
