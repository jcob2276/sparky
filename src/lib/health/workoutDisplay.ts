/**
 * Shared display helpers for training hub / logger tonnage & RPE.
 * Avoids the "2.5 Mg" misread as "2.5 kg" on scheme cards.
 */

/** Format session tonnage for UI: under 1000 kg as "850 kg", else "2.5 t". */
export function formatWorkoutTonnage(totalTonnageKg: number): string | null {
  if (!Number.isFinite(totalTonnageKg) || totalTonnageKg <= 0) return null;
  if (totalTonnageKg < 1000) {
    return `${Math.round(totalTonnageKg)} kg`;
  }
  const tonnes = Math.round((totalTonnageKg / 1000) * 10) / 10;
  return `${tonnes} t`;
}

/** DB constraint is 1–10; treat 0 / null as unset so cards don't show "RPE 0". */
export function normalizeSessionRpe(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 1 || value > 10) return null;
  return value;
}

export function isStrengthLog(tags: string[] | null | undefined): boolean {
  if (!tags?.length) return true;
  return !tags.includes('activity') && !tags.includes('wellness');
}
