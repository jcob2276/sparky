/** Jaką część masy ciała podnosi się w ćwiczeniach z własnym ciężarem (0 kg w logu = sama masa ciała). */
const BODYWEIGHT_FACTORS: Array<{ pattern: RegExp; factor: number }> = [
  { pattern: /pompk|push-?\s*up/i, factor: 0.65 },
  { pattern: /stanie\s*na\s*r[eę]|handstand|hspu/i, factor: 1 },
  { pattern: /dip|podci[aą]g|pull-?\s*up|chin-?\s*up|muscle-?\s*up/i, factor: 1 },
  { pattern: /sumo|przysiad\s*z\s*wyskok|air\s*squat|pistol|shrimp/i, factor: 0.7 },
];

function bodyweightFactor(exerciseName: string): number {
  const name = exerciseName.trim();
  return BODYWEIGHT_FACTORS.find((entry) => entry.pattern.test(name))?.factor ?? 0;
}

/**
 * Obciążenie serii: dla ćwiczeń z własnym ciężarem dolicza masę ciała do wpisanego dociążenia
 * (dipy +5 kg = masa ciała + 5). Bez znanej masy ciała zwraca samo wpisane obciążenie.
 */
export function effectiveLoadKg(exerciseName: string, loggedKg: number, bodyWeightKg: number | null): number {
  const logged = Math.max(0, Number(loggedKg) || 0);
  const factor = bodyweightFactor(exerciseName);
  if (!factor || !bodyWeightKg || bodyWeightKg <= 0) return logged;
  return logged + bodyWeightKg * factor;
}
