/**
 * @file muscleRecovery.ts
 * @role Biomechaniczny model zmęczenia i regeneracji mięśniowej adaptowany z openGym.
 * Implementuje wykładniczy rozpad zmęczenia (half-life 36h), tonaż ważony intensywnością (load/1RM)^1.5,
 * oraz retencję siły z detreningiem (14 dni plateau + 28d half-life do podłogi 0.5).
 */

import { epley } from './workout';

export const FATIGUE_HALF_LIFE_MS = 36 * 60 * 60 * 1000; // 36h half-life zmęczenia
export const STRENGTH_FULL_MS = 14 * 24 * 60 * 60 * 1000; // 14 dni pełnej retencji siły
export const STRENGTH_HALF_LIFE_MS = 28 * 24 * 60 * 60 * 1000; // 28 dni rozpadu do podłogi detreningu
export const STRENGTH_FLOOR = 0.5; // Podłoga 50% siły dla mięśni nietrenowanych/detrenowanych
export const FATIGUE_REF_VOLUME = 2000; // Referencyjny tonaż sesji dla 1 partii (kg)

export const MUSCLE_GROUPS = [
  'klatka',
  'plecy',
  'barki',
  'biceps',
  'triceps',
  'przedramiona',
  'brzuch',
  'czworogłowe',
  'dwugłowe ud',
  'pośladki',
  'łydki',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number] | string;

export interface LoggedSetInput {
  weightKg: number;
  reps: number;
  isWarmup?: boolean;
  done?: boolean;
  extraDrops?: Array<{ weightKg: number; reps: number }>;
}

export interface WorkoutSessionInput {
  date: string | number; // timestamp lub YYYY-MM-DD
  exercises: Array<{
    name: string;
    muscleTags: string[];
    sets: LoggedSetInput[];
  }>;
}

/**
 * Wykładniczy rozpad bodźca w oparciu o czas półtrwania.
 */
export function halfLifeDecay(ageMs: number, halfLifeMs: number): number {
  if (ageMs <= 0 || halfLifeMs <= 0) return 1;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

/**
 * Oblicza tonaż ważony intensywnością:
 * load * reps * min(1, load / e1RM)^1.5 + extra drops
 * Wykładnik 1.5 odwzorowuje fakt, że seria na 90% 1RM generuje nieporównywalnie większy
 * bodziec adaptacyjny i zmęczeniowy niż seria na 50% 1RM.
 */
export function calculateSetTonnage(
  weightKg: number,
  reps: number,
  oneRmKg?: number | null,
  extraDrops?: Array<{ weightKg: number; reps: number }>
): number {
  const w = Math.max(0, Number(weightKg) || 0);
  const r = Math.max(0, Number(reps) || 0);
  if (w <= 0 || r <= 0) return 0;

  const rawTonnage = w * r;
  let mainTonnage = rawTonnage;

  if (oneRmKg && oneRmKg > 0) {
    const intensity = Math.min(1, w / oneRmKg);
    mainTonnage = rawTonnage * Math.pow(intensity, 1.5);
  }

  let dropTonnage = 0;
  if (extraDrops?.length) {
    for (const drop of extraDrops) {
      const dw = Math.max(0, Number(drop.weightKg) || 0);
      const dr = Math.max(0, Number(drop.reps) || 0);
      if (dw > 0 && dr > 0) {
        const rawDrop = dw * dr;
        if (oneRmKg && oneRmKg > 0) {
          const dIntensity = Math.min(1, dw / oneRmKg);
          dropTonnage += rawDrop * Math.pow(dIntensity, 1.5);
        } else {
          dropTonnage += rawDrop;
        }
      }
    }
  }

  return Math.round((mainTonnage + dropTonnage) * 10) / 10;
}

/**
 * Parsuje wejściowy timestamp sesji (ISO string lub number).
 */
export function parseSessionTimestamp(date: string | number): number {
  if (typeof date === 'number') return date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00Z`).getTime();
  }
  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Szacuje najlepszy 1RM dla danego ćwiczenia w ramach sesji.
 */
function estimateSessionBest1RM(sets: LoggedSetInput[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.isWarmup || s.done === false) continue;
    const est = epley(s.weightKg, s.reps);
    if (est !== null && (best === null || est > best)) {
      best = est;
    }
  }
  return best;
}

/**
 * Oblicza stan zmęczenia mięśniowego (0.0 - 1.0) dla poszczególnych partii mięśniowych
 * na dany punkt w czasie `nowMs`.
 */
export function calculateMuscleFatigue(
  sessions: WorkoutSessionInput[],
  nowMs: number = Date.now(),
  customRefVolume: number = FATIGUE_REF_VOLUME
): Record<string, number> {
  const stimuliByMuscle: Record<string, Array<{ timestamp: number; stimulus: number }>> = {};
  for (const mg of MUSCLE_GROUPS) {
    stimuliByMuscle[mg] = [];
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => parseSessionTimestamp(a.date) - parseSessionTimestamp(b.date)
  );

  for (const session of sortedSessions) {
    const timestamp = parseSessionTimestamp(session.date);
    if (timestamp > nowMs) continue;

    const sessionTonnageByMuscle: Record<string, number> = {};

    for (const ex of session.exercises) {
      const validSets = ex.sets.filter((s) => !s.isWarmup && s.done !== false);
      if (!validSets.length) continue;

      const oneRm = estimateSessionBest1RM(validSets);
      const exTonnage = validSets.reduce(
        (sum, s) => sum + calculateSetTonnage(s.weightKg, s.reps, oneRm, s.extraDrops),
        0
      );

      const tags = ex.muscleTags?.length ? ex.muscleTags : ['inne'];
      const share = exTonnage / tags.length;

      for (const tag of tags) {
        sessionTonnageByMuscle[tag] = (sessionTonnageByMuscle[tag] || 0) + share;
      }
    }

    for (const [muscle, tonnage] of Object.entries(sessionTonnageByMuscle)) {
      if (tonnage <= 0) continue;
      if (!stimuliByMuscle[muscle]) stimuliByMuscle[muscle] = [];
      const normStimulus = tonnage / customRefVolume;
      stimuliByMuscle[muscle].push({ timestamp, stimulus: normStimulus });
    }
  }

  const result: Record<string, number> = {};

  for (const [muscle, events] of Object.entries(stimuliByMuscle)) {
    if (!events.length) {
      result[muscle] = 0;
      continue;
    }

    let acc = 0;
    let lastTime = events[0].timestamp;

    for (const ev of events) {
      acc *= halfLifeDecay(ev.timestamp - lastTime, FATIGUE_HALF_LIFE_MS);
      acc += ev.stimulus;
      lastTime = ev.timestamp;
    }

    acc *= halfLifeDecay(Math.max(0, nowMs - lastTime), FATIGUE_HALF_LIFE_MS);
    // Krzywa nasycenia bodźca 1 - exp(-acc)
    const fatigue = 1 - Math.exp(-acc);
    result[muscle] = Math.round(Math.min(1, Math.max(0, fatigue)) * 100) / 100;
  }

  return result;
}

/**
 * Oblicza retencję siły (0.5 do 1.0) dla poszczególnych partii.
 * 1.0 = pełna siła (trening w ciągu ostatnich 14 dni).
 * Poniżej 1.0 = detrening postępujący z half-life = 28 dni do podłogi 0.5.
 */
export function calculateMuscleStrengthRetention(
  sessions: WorkoutSessionInput[],
  nowMs: number = Date.now()
): Record<string, number> {
  const latestByMuscle: Record<string, number> = {};
  for (const mg of MUSCLE_GROUPS) {
    latestByMuscle[mg] = -Infinity;
  }

  for (const session of sessions) {
    const timestamp = parseSessionTimestamp(session.date);
    if (timestamp > nowMs) continue;

    for (const ex of session.exercises) {
      const hasCompletedSet = ex.sets.some((s) => !s.isWarmup && s.done !== false);
      if (!hasCompletedSet) continue;

      for (const tag of ex.muscleTags || []) {
        if (timestamp > (latestByMuscle[tag] ?? -Infinity)) {
          latestByMuscle[tag] = timestamp;
        }
      }
    }
  }

  const result: Record<string, number> = {};

  for (const [muscle, lastTime] of Object.entries(latestByMuscle)) {
    if (!Number.isFinite(lastTime)) {
      result[muscle] = STRENGTH_FLOOR;
      continue;
    }

    const age = nowMs - lastTime;
    if (age <= STRENGTH_FULL_MS) {
      result[muscle] = 1.0;
    } else {
      const decayAge = age - STRENGTH_FULL_MS;
      const decayed = halfLifeDecay(decayAge, STRENGTH_HALF_LIFE_MS);
      result[muscle] = Math.round(Math.max(STRENGTH_FLOOR, decayed) * 100) / 100;
    }
  }

  return result;
}

/**
 * Zwraca partie mięśniowe w stanie zmęczenia (wartość > 0.5).
 */
export function getFatiguedMuscles(
  fatigueMap: Record<string, number>,
  threshold = 0.5
): string[] {
  return Object.entries(fatigueMap)
    .filter(([, val]) => val > threshold)
    .map(([m]) => m);
}

/**
 * Zwraca partie mięśniowe dotknięte detreningiem (retencja siły < 1.0).
 */
export function getDetrainedMuscles(
  strengthMap: Record<string, number>,
  threshold = 1.0
): string[] {
  return Object.entries(strengthMap)
    .filter(([, val]) => val < threshold)
    .map(([m]) => m);
}
