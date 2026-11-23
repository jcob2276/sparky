/** Pomocnicze funkcje tablicy przedmiotów: monogram, kolor, etykieta terminu i pierścień postępu. */

const SKIP_WORDS = new Set(['w', 'i', 'z', 'o', 'na', 'do', 'dla', 'oraz']);

/** Do trzech liter z początków znaczących słów („Bezpieczeństwo sieci komputerowych II” → „BSK”). */
export function subjectMonogram(title: string): string {
  const letters = title.split(/\s+/)
    .filter((word) => word.length > 3 && !SKIP_WORDS.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase());
  const fallback = title.trim().slice(0, 2).toUpperCase();
  return (letters.slice(0, 3).join('') || fallback) || '?';
}

/** Stały odcień 0–359 z nazwy: ten sam przedmiot ma zawsze ten sam kolor. */
export function subjectHue(title: string): number {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

const dayNumber = (date: string): number => Math.round(Date.parse(`${date}T12:00:00Z`) / 86_400_000);

export type DueTone = 'overdue' | 'soon' | 'calm';
export interface DueLabel { text: string; tone: DueTone }

/** Termin względem dziś: „dziś”, „jutro”, „za 5 dni”, „po terminie (2 d)”. */
export function dueLabel(today: string, due: string | null): DueLabel | null {
  if (!due) return null;
  const diff = dayNumber(due.slice(0, 10)) - dayNumber(today);
  if (!Number.isFinite(diff)) return null;
  if (diff < 0) return { text: `po terminie (${-diff} d)`, tone: 'overdue' };
  if (diff === 0) return { text: 'dziś', tone: 'soon' };
  if (diff === 1) return { text: 'jutro', tone: 'soon' };
  return { text: `za ${diff} dni`, tone: diff <= 3 ? 'soon' : 'calm' };
}

/** Udział wykonanych zadań 0–1 (0, gdy przedmiot nie ma zadań). */
export function doneRatio(open: number, done: number): number {
  const total = open + done;
  return total > 0 ? done / total : 0;
}
