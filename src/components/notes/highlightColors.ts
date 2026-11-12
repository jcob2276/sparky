export interface HighlightColor {
  id: string;
  label: string;
  /** CSS custom properties from notes.css: the pastel text background and the saturated swatch. */
  background: string;
  swatch: string;
}

/** Same five colours as the Apple Notes highlighter. */
export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { id: 'violet', label: 'Fioletowy', background: '--note-hl-violet', swatch: '--note-hl-dot-violet' },
  { id: 'pink', label: 'Różowy', background: '--note-hl-pink', swatch: '--note-hl-dot-pink' },
  { id: 'orange', label: 'Pomarańczowy', background: '--note-hl-orange', swatch: '--note-hl-dot-orange' },
  { id: 'mint', label: 'Miętowy', background: '--note-hl-mint', swatch: '--note-hl-dot-mint' },
  { id: 'blue', label: 'Niebieski', background: '--note-hl-blue', swatch: '--note-hl-dot-blue' },
];

const STORAGE_KEY = 'sparky_note_highlight_color';
const DEFAULT_ID = 'orange';

export function readHighlightColor(): string {
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    return HIGHLIGHT_COLORS.some((color) => color.id === id) ? (id as string) : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function saveHighlightColor(id: string): void {
  try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* the choice just is not remembered */ }
}

/** execCommand needs a concrete colour value, so the token is read at the moment of use. */
export function highlightBackground(id: string): string {
  const color = HIGHLIGHT_COLORS.find((item) => item.id === id) ?? HIGHLIGHT_COLORS[2];
  return getComputedStyle(document.documentElement).getPropertyValue(color.background).trim();
}
