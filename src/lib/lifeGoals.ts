/**
 * Cele życiowe: wartości awaryjne i formatowanie tekstów. Właściciele wartości są w bazie (`docs/SINGLE_SOURCE.md`):
 * tłuszcz w `nutrition_profile.goal_body_fat`, wyciskanie i dochód w `life_targets`. Komponenty czytają je przez
 * `useLifeTargets`; stałe poniżej służą tylko do czasu załadowania i gdy wiersza nie ma.
 */
export interface LifeTargets {
  bodyFatPct: number;
  benchKg: number;
  incomeNetPln: number;
}

export const DEFAULT_LIFE_TARGETS: LifeTargets = { bodyFatPct: 14, benchKg: 100, incomeNetPln: 15000 };

export const incomeLabel = (t: LifeTargets) => `${t.incomeNetPln.toLocaleString('pl-PL')} zł netto / msc`;
export const incomeShort = (t: LifeTargets) => `${t.incomeNetPln / 1000}k zł / msc`;
export const bodyShort = (t: LifeTargets) => `${t.bodyFatPct}% BF · ${t.benchKg} kg`;
