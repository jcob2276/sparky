/**
 * The 6 "life spheres" — a weekly time-balance axis, distinct from the 3
 * growth pillars (Ciało/Duch/Konto tied to dreams/projects) and distinct from
 * subjective 1-10 self-ratings. This is
 * the single source of truth for the sphere vocabulary stored in
 * vanguard_calendar.category, vanguard_time_budgets.category and
 * todo_items.category — do not hardcode this list elsewhere.
 */
export type LifeSphereId =
  | 'praca'
  | 'cialo_trening'
  | 'duch_refleksja'
  | 'finanse'
  | 'relacje_rodzina'
  | 'odpoczynek_regeneracja';

export interface LifeSphere {
  id: LifeSphereId;
  label: string;
  dot: string;
  bar: string;
  text: string;
  border: string;
  bgSoft: string;
  calClass: string;
}

export const LIFE_SPHERES: LifeSphere[] = [
  { id: 'praca', label: 'Praca', dot: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', bgSoft: 'bg-blue-500/8', calClass: 'bg-blue-500 dark:bg-blue-600 text-white font-black border border-blue-500/20 shadow-sm' },
  { id: 'cialo_trening', label: 'Ciało / Trening', dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', bgSoft: 'bg-emerald-500/8', calClass: 'bg-emerald-500 dark:bg-emerald-600 text-white font-black border border-emerald-500/20 shadow-sm' },
  { id: 'duch_refleksja', label: 'Duch / Refleksja', dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20', bgSoft: 'bg-sky-500/8', calClass: 'bg-sky-500 dark:bg-sky-600 text-white font-black border border-sky-500/20 shadow-sm' },
  { id: 'finanse', label: 'Finanse', dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', bgSoft: 'bg-amber-500/8', calClass: 'bg-amber-500 dark:bg-amber-600 text-white font-black border border-amber-500/20 shadow-sm' },
  { id: 'relacje_rodzina', label: 'Relacje / Rodzina', dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', bgSoft: 'bg-violet-500/8', calClass: 'bg-violet-500 dark:bg-violet-600 text-white font-black border border-violet-500/20 shadow-sm' },
  { id: 'odpoczynek_regeneracja', label: 'Odpoczynek / Regeneracja', dot: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', bgSoft: 'bg-rose-500/8', calClass: 'bg-rose-500 dark:bg-rose-600 text-white font-black border border-rose-500/20 shadow-sm' },
];

/** Pre-2026-07-04 category values, kept only for reference — do not write these anymore. */
export const LEGACY_CATEGORY_TO_SPHERE: Record<string, LifeSphereId> = {
  work: 'praca',
  health: 'cialo_trening',
  sport: 'cialo_trening',
  personal: 'relacje_rodzina',
  study: 'duch_refleksja',
};
