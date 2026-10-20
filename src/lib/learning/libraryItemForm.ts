import type { NewLibraryItem } from './libraryImport';
import type { LibraryType } from './shelfModel';

export interface LibraryItemFormState {
  title: string;
  author: string;
  resourceType: LibraryType;
  /** Surowy tekst; puste = nie wiem (książka dostanie średnią grubość). */
  pages: string;
  /** Dokładna data (opcjonalna); ma pierwszeństwo przed samym rokiem. */
  finishedOn: string;
  /** Sam rok (opcjonalny), gdy nie pamiętasz dnia. */
  finishedYear: string;
}

export type LibraryItemResult = { ok: true; value: NewLibraryItem } | { ok: false; error: string };

export function initialLibraryForm(type: LibraryType = 'book'): LibraryItemFormState {
  return { title: '', author: '', resourceType: type, pages: '', finishedOn: '', finishedYear: '' };
}

export function validateLibraryItem(form: LibraryItemFormState, today: string): LibraryItemResult {
  const title = form.title.trim();
  if (!title) return { ok: false, error: 'Wpisz tytuł.' };
  if (title.length > 200) return { ok: false, error: 'Tytuł jest za długi (max 200 znaków).' };
  const author = form.author.trim();
  if (author.length > 200) return { ok: false, error: 'Autor jest za długi (max 200 znaków).' };

  let pages: number | null = null;
  if (form.pages.trim()) {
    const n = Number(form.pages);
    if (!/^\d{1,4}$/.test(form.pages.trim()) || n < 1 || n > 5000) {
      return { ok: false, error: 'Liczba stron musi być od 1 do 5000.' };
    }
    pages = n;
  }

  let finishedOn: string | null = null;
  let finishedYear: number | null = null;
  if (form.finishedOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.finishedOn)) return { ok: false, error: 'Data ma zły format.' };
    if (form.finishedOn > today) return { ok: false, error: 'Data ukończenia nie może być w przyszłości.' };
    finishedOn = form.finishedOn;
  } else if (form.finishedYear.trim()) {
    const year = Number(form.finishedYear);
    const currentYear = Number(today.slice(0, 4));
    if (!/^\d{4}$/.test(form.finishedYear.trim()) || year < 1900 || year > currentYear) {
      return { ok: false, error: `Rok musi być od 1900 do ${currentYear}.` };
    }
    finishedYear = year;
  }

  const countsPages = form.resourceType === 'book' || form.resourceType === 'course';
  return {
    ok: true,
    value: {
      title,
      author: author || null,
      resourceType: form.resourceType,
      pages: countsPages ? pages : null,
      finishedOn,
      finishedYear,
      rating: null,
      source: 'manual',
    },
  };
}
