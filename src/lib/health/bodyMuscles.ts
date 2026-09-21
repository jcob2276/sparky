/**
 * @file bodyMuscles.ts
 * @role Mapowanie anatomiczne grup mięśniowych z openGym do polskiego modelu Sparky
 * oraz przeliczanie poziomów zmęczenia (0-4) dla wektorowej mapy ciała SVG.
 */

export const SVG_MUSCLES = [
  'trapezius',
  'deltoids',
  'chest',
  'upper-back',
  'serratus',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'hip-flexors',
  'calves',
  'tibialis',
] as const;

export type SvgMuscle = typeof SVG_MUSCLES[number];

export const INERT_BODY_PARTS = [
  'head',
  'hair',
  'neck',
  'hands',
  'feet',
  'knees',
  'ankles',
] as const;

export const MUSCLE_PL_NAMES: Record<SvgMuscle, string> = {
  chest: 'Klatka piersiowa',
  abs: 'Brzuch',
  obliques: 'Mięśnie skośne brzucha',
  biceps: 'Biceps',
  triceps: 'Triceps',
  deltoids: 'Barki / Naramienne',
  trapezius: 'Czworoboczny (Kaptury)',
  'upper-back': 'Górne plecy / Najszerszy',
  'lower-back': 'Dolne plecy (Prostowniki)',
  serratus: 'Mięsień zębaty',
  forearm: 'Przedramiona',
  gluteal: 'Pośladki',
  quadriceps: 'Czworogłowe ud',
  hamstring: 'Dwugłowe ud (Kulszowo-goleniowe)',
  adductors: 'Przywodziciele',
  'hip-flexors': 'Zginacze biodra',
  calves: 'Łydki',
  tibialis: 'Piszczelowy przedni',
};

/**
 * Mapowanie tagów Sparky na anatomiczne identyfikatory SVG.
 */
export const SPARKY_TO_SVG_MAP: Record<string, SvgMuscle[]> = {
  klatka: ['chest'],
  plecy: ['upper-back', 'lower-back', 'trapezius'],
  barki: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  przedramiona: ['forearm'],
  brzuch: ['abs', 'obliques'],
  czworogłowe: ['quadriceps'],
  'dwugłowe ud': ['hamstring'],
  pośladki: ['gluteal'],
  łydki: ['calves', 'tibialis'],
};

export const VANGUARD_TO_SVG_MAP = SPARKY_TO_SVG_MAP;

/**
 * Przekształca mapę zmęczenia (0.0 - 1.0) ze Sparky (np. z muscleRecovery.ts)
 * na poziomy podświetlenia SVG (0 - 4).
 * 0 = świeży / brak obciążenia
 * 1 = lekki bodziec (0.10 - 0.35)
 * 2 = umiarkowany (0.35 - 0.60)
 * 3 = mocny (0.60 - 0.85)
 * 4 = maksymalne zmęczenie (> 0.85)
 */
export function calculateSvgMuscleLevels(
  fatigueByTag: Record<string, number>
): Record<SvgMuscle, number> {
  const levels: Partial<Record<SvgMuscle, number>> = {};
  for (const m of SVG_MUSCLES) {
    levels[m] = 0;
  }

  for (const [tag, fatigue] of Object.entries(fatigueByTag)) {
    const svgMuscles = SPARKY_TO_SVG_MAP[tag.toLowerCase()];
    if (!svgMuscles) continue;

    let level = 0;
    if (fatigue >= 0.85) level = 4;
    else if (fatigue >= 0.6) level = 3;
    else if (fatigue >= 0.35) level = 2;
    else if (fatigue >= 0.1) level = 1;

    for (const sm of svgMuscles) {
      levels[sm] = Math.max(levels[sm] || 0, level);
    }
  }

  return levels as Record<SvgMuscle, number>;
}
