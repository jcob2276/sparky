/**
 * @file effortScale.ts
 * @role System skalowania wysiłku RIR / RPE wraz z paletą barwną z openGym.
 * Zapewnia spójność między postrzeganym wysiłkiem (RPE) a powtórzeniami w zapasie (RIR).
 * RIR 0 == RPE 10 (upadek). RIR 2 == RPE 8.
 */

export interface EffortBand {
  rir: number;
  maxRir: number;
  rpe: number;
  color: string;
  labelPl: string;
  feelPl: string;
}

export const EFFORT_BANDS: EffortBand[] = [
  {
    rir: 0,
    maxRir: 0.25,
    rpe: 10,
    color: 'var(--color-effort-failure, #a855f7)', // Purple
    labelPl: '0 RIR (RPE 10)',
    feelPl: 'Brak powtórzeń w zapasie — upadek mięśniowy',
  },
  {
    rir: 0.5,
    maxRir: 0.75,
    rpe: 9.5,
    color: 'var(--color-effort-near-failure, #ef4444)', // Red
    labelPl: '0.5 RIR (RPE 9.5)',
    feelPl: 'Może pół powtórzenia w zapasie',
  },
  {
    rir: 1,
    maxRir: 1.5,
    rpe: 9,
    color: 'var(--color-effort-hard, #f97316)', // Orange
    labelPl: '1 RIR (RPE 9)',
    feelPl: 'Jedno solidne powtórzenie w zapasie',
  },
  {
    rir: 2,
    maxRir: 2.5,
    rpe: 8,
    color: 'var(--color-effort-moderate, #eab308)', // Yellow
    labelPl: '2 RIR (RPE 8)',
    feelPl: 'Dwa powtórzenia w zapasie — optymalna seria robocza',
  },
  {
    rir: 3,
    maxRir: 3.5,
    rpe: 7,
    color: 'var(--color-effort-light, #22c55e)', // Green
    labelPl: '3 RIR (RPE 7)',
    feelPl: 'Trzy powtórzenia w zapasie',
  },
  {
    rir: 4,
    maxRir: Infinity,
    rpe: 6,
    color: 'var(--color-effort-warmup, #06b6d4)', // Cyan / Warmup
    labelPl: '4+ RIR (RPE ≤6)',
    feelPl: 'Lekka seria / strefa rozgrzewkowa',
  },
];

export function rpeToRir(rpe: number | null | undefined): number | null {
  if (rpe === null || rpe === undefined || Number.isNaN(Number(rpe))) return null;
  const val = Number(rpe);
  return Math.max(0, Math.round((10 - val) * 10) / 10);
}

export function rirToRpe(rir: number | null | undefined): number | null {
  if (rir === null || rir === undefined || Number.isNaN(Number(rir))) return null;
  const val = Number(rir);
  return Math.min(10, Math.max(0, Math.round((10 - val) * 10) / 10));
}

export function normalizeToRir(
  rir: number | string | null | undefined,
  rpe: number | string | null | undefined
): number | null {
  if (rir !== null && rir !== undefined && rir !== '') {
    const n = Number(rir);
    if (!Number.isNaN(n)) return n;
  }
  if (rpe !== null && rpe !== undefined && rpe !== '') {
    const n = Number(rpe);
    if (!Number.isNaN(n)) return rpeToRir(n);
  }
  return null;
}

export function getEffortColor(rir: number | null | undefined): string | null {
  if (rir === null || rir === undefined || Number.isNaN(Number(rir))) return null;
  const n = Number(rir);
  for (const band of EFFORT_BANDS) {
    if (n <= band.maxRir) return band.color;
  }
  return EFFORT_BANDS[EFFORT_BANDS.length - 1].color;
}

export function getEffortBand(rir: number | null | undefined): EffortBand | null {
  if (rir === null || rir === undefined || Number.isNaN(Number(rir))) return null;
  const n = Number(rir);
  for (const band of EFFORT_BANDS) {
    if (n <= band.maxRir) return band;
  }
  return EFFORT_BANDS[EFFORT_BANDS.length - 1];
}

/**
 * Seria uznawana za ciężką stymulacyjnie (RIR <= 3).
 */
export function isHardSet(rir: number | null | undefined): boolean {
  if (rir === null || rir === undefined || Number.isNaN(Number(rir))) return false;
  return Number(rir) <= 3;
}
