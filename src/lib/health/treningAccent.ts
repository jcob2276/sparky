/**
 * Scoped training-app accent presets (/trening only).
 * Persisted in localStorage; applied via data-tren-accent on html + .trening-theme.
 */
import { STORAGE_KEYS } from '../constants';

const TRENING_ACCENT_IDS = ['lime', 'teal', 'orange', 'blue'] as const;
export type TreningAccentId = (typeof TRENING_ACCENT_IDS)[number];

export type TreningAccentPreset = {
  id: TreningAccentId;
  label: string;
  hint: string;
  swatch: string;
};

export const TRENING_ACCENT_PRESETS: TreningAccentPreset[] = [
  { id: 'lime', label: 'Seledyn', hint: 'Domyślny Sparky', swatch: '#C1FF2C' },
  { id: 'teal', label: 'Teal', hint: 'Chłodny athletic', swatch: '#2DD4BF' },
  { id: 'orange', label: 'Flame', hint: 'Stronger-like', swatch: '#FF9F0A' },
  { id: 'blue', label: 'Ocean', hint: 'iOS electric', swatch: '#64D2FF' },
];

export const DEFAULT_TRENING_ACCENT: TreningAccentId = 'lime';

export function isTreningAccentId(value: unknown): value is TreningAccentId {
  return typeof value === 'string' && (TRENING_ACCENT_IDS as readonly string[]).includes(value);
}

export function readTreningAccent(): TreningAccentId {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRENING_ACCENT);
    if (isTreningAccentId(raw)) return raw;
  } catch {
    /* private mode / SSR */
  }
  return DEFAULT_TRENING_ACCENT;
}

export function writeTreningAccent(id: TreningAccentId): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRENING_ACCENT, id);
  } catch {
    /* ignore quota */
  }
}

/** Live-apply accent so hub, logger, and portaled modals share CSS vars. */
export function applyTreningAccent(id: TreningAccentId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.trenAccent = id;
  document.querySelectorAll('.trening-theme').forEach((node) => {
    node.setAttribute('data-tren-accent', id);
  });
}
