/**
 * @file muscularCardioLoad.ts
 * @role Obliczanie rozbicia obciążenia na Cardio Load vs Muscular Load oraz statusu regeneracji grup mięśniowych
 * w stylu Bevel Health.
 */

export interface MuscleStatus {
  name: string; // np. 'Klatka', 'Plecy', 'Czworogłowe'
  readinessPercentage: number; // 0 - 100%
  status: 'recovered' | 'partial' | 'fatigued';
  statusLabel: string;
}

export interface MuscularCardioLoadInput {
  cardioLoad: number | null | undefined; // np. TRIMP lub punkty kardio z daily_strain (0 - 100+)
  strengthLoad: number | null | undefined; // punkty siłowe z daily_strain (0 - 100+)
  recentSessionsTonnage?: Record<string, number>; // np. { klatka: 1800, nogi: 3200 }
}

export interface MuscularCardioLoadResult {
  cardioPoints: number;
  muscularPoints: number;
  cardioPercentage: number; // 0 - 100%
  muscularPercentage: number; // 0 - 100%
  dominantLoad: 'cardio' | 'muscular' | 'balanced';
  explanation: string;
  muscleGroups: MuscleStatus[];
}

const DEFAULT_MUSCLE_GROUPS = [
  'Klatka piersiowa',
  'Plecy',
  'Barki',
  'Ramiona',
  'Czworogłowe ud',
  'Kulszowo-goleniowe',
  'Brzuch',
];

export function computeMuscularCardioLoad(
  input: MuscularCardioLoadInput = { cardioLoad: 0, strengthLoad: 0 }
): MuscularCardioLoadResult {
  const safeInput = input || { cardioLoad: 0, strengthLoad: 0 };
  const cardio = Math.max(0, Number(safeInput.cardioLoad) || 0);
  const muscular = Math.max(0, Number(safeInput.strengthLoad) || 0);

  const total = cardio + muscular;
  let cardioPct = 50;
  let muscularPct = 50;

  if (total > 0) {
    cardioPct = Math.round((cardio / total) * 100);
    muscularPct = 100 - cardioPct;
  }

  let dominantLoad: 'cardio' | 'muscular' | 'balanced' = 'balanced';
  let explanation = 'Równomierne rozłożenie obciążenia sercowo-naczyniowego i mięśniowego.';

  if (cardioPct >= 65) {
    dominantLoad = 'cardio';
    explanation = 'Dziś dominuje obciążenie wydolnościowe (Cardio Load). Układ sercowo-naczyniowy wykonał główną pracę.';
  } else if (muscularPct >= 65) {
    dominantLoad = 'muscular';
    explanation = 'Dziś dominuje obciążenie mięśniowe (Muscular Load) z treningu siłowego. Zapewnij odpowiednią podaż białka.';
  }

  // Obliczenie statusu regeneracji poszczególnych partii
  const muscleGroups: MuscleStatus[] = DEFAULT_MUSCLE_GROUPS.map((name) => {
    const key = name.toLowerCase();
    // Sprawdzamy czy partia miała ostatnio wysoki tonaż
    const recentVolume = safeInput.recentSessionsTonnage?.[key] ?? 0;
    let readiness = 95;
    if (recentVolume > 4000) {
      readiness = 40; // mocno zmęczone
    } else if (recentVolume > 1500) {
      readiness = 65; // częściowo zmęczone
    } else if (muscular > 10 && (key.includes('klatka') || key.includes('plecy'))) {
      readiness = 75; // umiarkowane zmęczenie po ogólnym treningu
    }

    let status: 'recovered' | 'partial' | 'fatigued' = 'recovered';
    let statusLabel = 'W pełni zregenerowane';

    if (readiness < 50) {
      status = 'fatigued';
      statusLabel = 'Przeciążone / Regeneracja';
    } else if (readiness < 85) {
      status = 'partial';
      statusLabel = 'Częściowo gotowe';
    }

    return {
      name,
      readinessPercentage: readiness,
      status,
      statusLabel,
    };
  });

  return {
    cardioPoints: cardio,
    muscularPoints: muscular,
    cardioPercentage: cardioPct,
    muscularPercentage: muscularPct,
    dominantLoad,
    explanation,
    muscleGroups,
  };
}
