/**
 * @file workoutSetModel.ts
 * @role Zaawansowany model struktur serii treningowych adaptowany z openGym.
 * Obsługuje:
 * - Drop-sety: seria główna + tablica zrzutów ciążaru `drops: [{ kg, reps }]`
 * - Rest-pause (myo-reps): dekompozycja całkowitych powtórzeń na klastry `clusters: [{ reps, restSec }]`
 * - Serie unilateralne: niezależne śledzenie lewej i prawej strony `sides: { L, R }`
 */

export type SetType = 'straight' | 'warmup' | 'dropset' | 'restpause';

export interface DropSubRow {
  kg: number;
  reps: number;
}

export interface RestPauseCluster {
  reps: number;
  restSec: number;
}

export interface SideSetRow {
  kg: number;
  reps: number;
  done: boolean;
  rir?: number | null;
  rpe?: number | null;
}

export interface EnhancedWorkoutSet {
  id: number | string;
  type: SetType;
  phase: 'work' | 'warmup';
  kg: string | number;
  reps: string | number;
  rir?: string | number | null;
  rpe?: string | number | null;
  done?: boolean;
  msp?: boolean;
  drops?: DropSubRow[];
  clusters?: RestPauseCluster[];
  sides?: {
    L: SideSetRow;
    R: SideSetRow;
  };
}

/**
 * Zwraca typ serii (straight | warmup | dropset | restpause).
 */
export function getSetType(s: Partial<EnhancedWorkoutSet>): SetType {
  if (s.phase === 'warmup' || s.type === 'warmup') return 'warmup';
  if (s.type === 'dropset' || s.type === 'restpause') return s.type;
  return 'straight';
}

/**
 * Zwraca dodatkową objętość (tonaż) z tytułu drop-setów.
 * Uwaga: Rest-pause NIE dodaje objętości, gdyż pole `reps` serii stanowi już łączną sumę klastrów.
 */
export function extraVolumeOfSet(s: EnhancedWorkoutSet): number {
  if (s.type === 'dropset' && Array.isArray(s.drops)) {
    return s.drops.reduce((sum, d) => sum + (Number(d.kg) || 0) * (Number(d.reps) || 0), 0);
  }
  return 0;
}

/**
 * Dodaje zrzut ciężaru do serii, przekształcając ją w drop-set.
 */
export function addDropToSet(set: EnhancedWorkoutSet, drop: DropSubRow): EnhancedWorkoutSet {
  const currentDrops = set.drops ? [...set.drops] : [];
  return {
    ...set,
    type: 'dropset',
    drops: [...currentDrops, { kg: Number(drop.kg) || 0, reps: Number(drop.reps) || 0 }],
  };
}

/**
 * Usuwa zrzut ciężaru o danym indeksie.
 * Usunięcie ostatniego zrzutu cofa serię do typu 'straight'.
 */
export function removeDropFromSet(set: EnhancedWorkoutSet, index: number): EnhancedWorkoutSet {
  const drops = (set.drops || []).filter((_, idx) => idx !== index);
  return {
    ...set,
    type: drops.length > 0 ? 'dropset' : 'straight',
    drops,
  };
}

/**
 * Dodaje klaster rest-pause.
 */
export function addClusterToSet(set: EnhancedWorkoutSet, cluster: RestPauseCluster): EnhancedWorkoutSet {
  const currentClusters = set.clusters ? [...set.clusters] : [];
  return {
    ...set,
    type: 'restpause',
    clusters: [...currentClusters, { reps: Number(cluster.reps) || 0, restSec: Number(cluster.restSec) || 15 }],
  };
}

/**
 * Usuwa klaster rest-pause o danym indeksie.
 */
export function removeClusterFromSet(set: EnhancedWorkoutSet, index: number): EnhancedWorkoutSet {
  const clusters = (set.clusters || []).filter((_, idx) => idx !== index);
  return {
    ...set,
    type: clusters.length > 0 ? 'restpause' : 'straight',
    clusters,
  };
}

/**
 * Sugerowany ciężar dla kolejnego zrzutu w drop-secie (domyślnie 20% lżej, zaokrąglone do 0.5 kg).
 */
export function nextDropWeight(prevWeight: number | string, pct = 20): number {
  const w = Number(prevWeight) || 0;
  const p = Math.min(90, Math.max(1, pct));
  return Math.round(Math.max(0, w * (1 - p / 100)) * 2) / 2;
}

/**
 * Sugerowana liczba powtórzeń dla kolejnego klastra w rest-pause (zwykle połowa poprzedniego, min. 1).
 */
export function nextBurstReps(prevReps: number | string): number {
  const r = Number(prevReps) || 0;
  return Math.max(1, Math.round(r / 2));
}

/**
 * Rozbija łączną docelową liczbę powtórzeń rest-pause na malejącą sekwencję klastrów
 * sumującą się dokładnie do zadanej wartości (np. 12 -> [6, 3, 2, 1]).
 */
export function splitBurstReps(totalReps: number | string): number[] {
  const bursts: number[] = [];
  let remaining = Math.max(0, Math.round(Number(totalReps) || 0));
  while (remaining > 0) {
    const burst = Math.min(remaining, nextBurstReps(remaining));
    bursts.push(burst);
    remaining -= burst;
  }
  return bursts;
}

/**
 * Synchronizuje wiersz serii unilateralnej na podstawie stanu L i R:
 * - reps = L.reps + R.reps
 * - kg = max(L.kg, R.kg)
 * - done = L.done && R.done
 */
export function syncSideSummary(set: EnhancedWorkoutSet): EnhancedWorkoutSet {
  if (!set.sides) return set;
  const { L, R } = set.sides;
  return {
    ...set,
    kg: Math.max(Number(L.kg) || 0, Number(R.kg) || 0),
    reps: (Number(L.reps) || 0) + (Number(R.reps) || 0),
    done: Boolean(L.done && R.done),
  };
}
