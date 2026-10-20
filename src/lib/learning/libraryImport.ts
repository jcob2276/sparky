import type { LibraryType } from './shelfModel';

type ImportSource = 'manual' | 'paste' | 'csv';

export interface NewLibraryItem {
  title: string;
  author: string | null;
  resourceType: LibraryType;
  pages: number | null;
  finishedOn: string | null;
  finishedYear: number | null;
  rating: number | null;
  source: ImportSource;
}

export interface ListParseResult {
  rows: NewLibraryItem[];
  /** Linie, których nie dało się użyć (np. puste tytuły), do pokazania w podglądzie. */
  skipped: number;
}

const MAX_ROWS = 1000;
const MAX_TEXT = 200;

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ł/g, 'l');
}

/** Rozpoznaje słowo opisujące rodzaj (książki, filmy, kursy…). */
export function typeFromWord(word: string): LibraryType | null {
  const w = fold(word.trim());
  if (/^(ksiazk|book|literatur|czytan)/.test(w)) return 'book';
  if (/^(film|movie|serial|seri|video|wideo|kino|obejrzan)/.test(w)) return 'video';
  if (/^(kurs|course|szkolen)/.test(w)) return 'course';
  if (/^(podcast)/.test(w)) return 'podcast';
  if (/^(artykul|article)/.test(w)) return 'article';
  return null;
}

/** Tytuł musi zawierać literę lub cyfrę (same znaki interpunkcyjne to śmieć z wklejenia). */
function hasContent(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

function clip(text: string): string {
  return text.trim().slice(0, MAX_TEXT);
}

const BULLET = /^\s*(?:[-*•–—]|\d{1,3}[.)])\s+/;
const HEADER = /^(.{2,40}?):\s*$/;
const YEAR_TOKEN = /\b(19\d{2}|20\d{2})\b/;
const RATING_STARS = /\s*(★{1,5})\s*$/;
const RATING_FIVE = /\s*\b(\d(?:[.,]5)?)\s*\/\s*5\s*$/;
const RATING_TEN = /\s*\b(\d{1,2})\s*\/\s*10\s*$/;
const PAGES = /\s*\((\d{2,4})\s*(?:s\.|str\.?|stron|pages|p\.)\)\s*/i;
const INLINE_TYPE = /^\[([^\]]{2,20})\]\s*/;
const AUTHOR_SPLIT = /\s+[—–|]\s+|\s-\s+/;

interface Header {
  type: LibraryType | null;
  year: number | null;
}

function parseHeader(line: string): Header | null {
  const match = HEADER.exec(line);
  if (!match) return null;
  const inner = match[1];
  const year = YEAR_TOKEN.exec(inner);
  const type = typeFromWord(inner.replace(YEAR_TOKEN, '').trim().split(/\s+/)[0] ?? '');
  if (!type && !year) return null;
  if (!type && inner.replace(YEAR_TOKEN, '').replace(/[\s,-]/g, '').length > 0) return null;
  return { type, year: year ? Number(year[1]) : null };
}

function extractRating(text: string): { text: string; rating: number | null } {
  const stars = RATING_STARS.exec(text);
  if (stars) return { text: text.replace(RATING_STARS, ''), rating: stars[1].length };
  const five = RATING_FIVE.exec(text);
  if (five) return { text: text.replace(RATING_FIVE, ''), rating: clampRating(Number(five[1].replace(',', '.'))) };
  const ten = RATING_TEN.exec(text);
  if (ten) return { text: text.replace(RATING_TEN, ''), rating: clampRating(Number(ten[1]) / 2) };
  return { text, rating: null };
}

export function clampRating(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
}

/**
 * Wklejona lista, po jednej pozycji w linii. Nagłówki typu „Książki:”, „Filmy 2019:” albo „2018:” ustawiają
 * rodzaj i/lub rok dla kolejnych linii. Obsługuje wypunktowania, „Tytuł — Autor”, „[film] Tytuł”,
 * strony „(320 s.)” i oceny („★★★★”, „4/5”, „8/10”).
 */
export function parseLibraryList(text: string, defaultType: LibraryType): ListParseResult {
  const rows: NewLibraryItem[] = [];
  let skipped = 0;
  let currentType = defaultType;
  let currentYear: number | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (rows.length >= MAX_ROWS) break;
    let line = rawLine.trim();
    if (!line) continue;

    const header = parseHeader(line);
    if (header) {
      if (header.type) currentType = header.type;
      currentYear = header.year ?? (header.type ? null : currentYear);
      continue;
    }

    line = line.replace(BULLET, '');
    let type = currentType;
    const inline = INLINE_TYPE.exec(line);
    if (inline) {
      const inlineType = typeFromWord(inline[1]);
      if (inlineType) {
        type = inlineType;
        line = line.replace(INLINE_TYPE, '');
      }
    }

    const rated = extractRating(line);
    line = rated.text;
    let pages: number | null = null;
    const pagesMatch = PAGES.exec(line);
    if (pagesMatch) {
      pages = Number(pagesMatch[1]);
      line = line.replace(PAGES, ' ').trim();
    }

    const split = AUTHOR_SPLIT.exec(line);
    const title = clip(split ? line.slice(0, split.index) : line);
    const author = split ? clip(line.slice(split.index + split[0].length)) : '';
    if (!hasContent(title)) {
      skipped += 1;
      continue;
    }
    rows.push({
      title,
      author: author || null,
      resourceType: type,
      pages: pages !== null && pages >= 1 && pages <= 5000 ? pages : null,
      finishedOn: null,
      finishedYear: currentYear,
      rating: rated.rating,
      source: 'paste',
    });
  }
  return { rows, skipped };
}

/** Parser CSV (RFC 4180): cudzysłowy, podwójne cudzysłowy, przecinki i nowe linie w polach, BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

/** Data z CSV: 2019/05/01, 2019-05-01 lub 01.05.2019; przyszłość i nonsens to null. */
export function parseCsvDate(raw: string | undefined, today: string): string | null {
  const value = (raw ?? '').trim();
  let iso: string | null = null;
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value);
  const dmy = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (ymd) iso = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  else if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!valid) return null;
  return iso > today || iso < '1900-01-01' ? null : iso;
}

export type CsvFormat = 'goodreads' | 'letterboxd' | 'generic' | 'unknown';

export interface CsvParseResult extends ListParseResult {
  format: CsvFormat;
}

function pagesFrom(raw: string | undefined): number | null {
  const n = Number((raw ?? '').replace(/\D/g, ''));
  return Number.isInteger(n) && n >= 1 && n <= 5000 ? n : null;
}

/** CSV z Goodreads (tylko półka „read”), Letterboxd (obejrzane) albo własny z nagłówkami Title/Autor/Rodzaj/Strony/Data/Ocena. */
export function parseLibraryCsv(text: string, today: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0, format: 'unknown' };
  const headers = table[0].map((h) => fold(h.trim()));
  const col = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const cell = (row: string[], index: number) => (index >= 0 ? (row[index] ?? '').trim() : '');

  const iTitle = col('title', 'tytul', 'name', 'nazwa');
  if (iTitle < 0) return { rows: [], skipped: 0, format: 'unknown' };
  const isGoodreads = col('exclusive shelf', 'bookshelves', 'my rating') >= 0 && col('author') >= 0;
  const isLetterboxd = !isGoodreads && col('letterboxd uri') >= 0;
  const format: CsvFormat = isGoodreads ? 'goodreads' : isLetterboxd ? 'letterboxd' : 'generic';

  const iAuthor = col('author', 'autor');
  const iPages = col('number of pages', 'pages', 'strony', 'liczba stron');
  const iDate = col('date read', 'watched date', 'date', 'data');
  const iRating = col('my rating', 'rating', 'ocena');
  const iShelf = col('exclusive shelf');
  const iType = col('type', 'typ', 'rodzaj');
  const iYear = col('year');

  const rows: NewLibraryItem[] = [];
  let skipped = 0;
  for (const row of table.slice(1)) {
    if (rows.length >= MAX_ROWS) break;
    if (isGoodreads && iShelf >= 0 && fold(cell(row, iShelf)) !== 'read') continue;
    let title = clip(cell(row, iTitle));
    if (!hasContent(title)) {
      skipped += 1;
      continue;
    }
    if (isLetterboxd && cell(row, iYear)) title = clip(`${title} (${cell(row, iYear)})`);
    const finishedOn = parseCsvDate(cell(row, iDate), today);
    rows.push({
      title,
      author: clip(cell(row, iAuthor)) || null,
      resourceType: isLetterboxd ? 'video' : (typeFromWord(cell(row, iType)) ?? 'book'),
      pages: pagesFrom(cell(row, iPages)),
      finishedOn,
      finishedYear: null,
      rating: clampRating(Number(cell(row, iRating).replace(',', '.'))),
      source: 'csv',
    });
  }
  return { rows, skipped, format };
}

function norm(text: string | null): string {
  return (text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function itemKey(item: { title: string; author: string | null; resourceType: string }): string {
  return `${norm(item.title)}|${norm(item.author)}|${item.resourceType}`;
}

/** Rozdziela import na nowe i duplikaty (względem biblioteki i względem samej paczki). */
export function splitDuplicates(
  rows: NewLibraryItem[],
  existing: Array<{ title: string; author: string | null; resource_type: string }>,
): { fresh: NewLibraryItem[]; duplicates: NewLibraryItem[] } {
  const seen = new Set(existing.map((e) => itemKey({ title: e.title, author: e.author, resourceType: e.resource_type })));
  const fresh: NewLibraryItem[] = [];
  const duplicates: NewLibraryItem[] = [];
  for (const row of rows) {
    const key = itemKey(row);
    if (seen.has(key)) duplicates.push(row);
    else {
      seen.add(key);
      fresh.push(row);
    }
  }
  return { fresh, duplicates };
}
