import type { Tables } from '../database.types';

export type LibraryItem = Tables<'library_items'>;
export type LibraryType = 'book' | 'video' | 'course' | 'article' | 'podcast' | 'other';

/** Kształt grzbietu na półce: książka to wysoki grzbiet, film to płaskie pudełko, reszta to cienka broszura. */
type SpineKind = 'book' | 'case' | 'booklet';

export interface Spine {
  kind: SpineKind;
  widthPx: number;
  heightPx: number;
  /** 0-359, stabilny dla danego tytułu (ta sama książka zawsze ma ten sam kolor). */
  hue: number;
}

export const LIBRARY_TYPE_LABELS: Record<LibraryType, string> = {
  book: 'Książka',
  video: 'Film / wideo',
  course: 'Kurs',
  article: 'Artykuł',
  podcast: 'Podcast',
  other: 'Inne',
};

const MIN_BOOK_WIDTH = 16;
const MAX_BOOK_WIDTH = 40;
const DEFAULT_BOOK_WIDTH = 26;
const CASE_WIDTH = 22;
const BOOKLET_WIDTH = 14;
const ITEM_GAP_PX = 3;
const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Prosty, stabilny hash tekstu (FNV-1a), żeby wygląd grzbietu zależał tylko od tytułu. */
export function hashTitle(title: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < title.length; i += 1) {
    hash ^= title.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function kindFor(type: string): SpineKind {
  if (type === 'book' || type === 'course') return 'book';
  if (type === 'video') return 'case';
  return 'booklet';
}

/** Grubość książki rośnie z liczbą stron; bez stron dostaje średnią grubość. */
export function spineFor(item: Pick<LibraryItem, 'title' | 'resource_type' | 'pages'>): Spine {
  const hash = hashTitle(item.title);
  const kind = kindFor(item.resource_type);
  const hue = hash % 360;
  const variation = (hash >>> 8) % 25;
  if (kind === 'case') return { kind, widthPx: CASE_WIDTH, heightPx: 118 + (variation % 10), hue };
  if (kind === 'booklet') return { kind, widthPx: BOOKLET_WIDTH, heightPx: 92 + (variation % 14), hue };
  const pages = item.pages ?? 0;
  const widthPx = pages > 1
    ? Math.min(MAX_BOOK_WIDTH, Math.max(MIN_BOOK_WIDTH, Math.round(MIN_BOOK_WIDTH + pages / 14)))
    : DEFAULT_BOOK_WIDTH;
  return { kind, widthPx, heightPx: 128 + variation, hue };
}

/** Dzieli pozycje na półki tak, żeby żadna nie wyszła poza szerokość kontenera (zachłannie, w kolejności). */
export function chunkRows<T extends { spine: Spine }>(items: T[], containerWidthPx: number): T[][] {
  const usable = Math.max(120, containerWidthPx);
  const rows: T[][] = [];
  let current: T[] = [];
  let used = 0;
  for (const item of items) {
    const need = item.spine.widthPx + ITEM_GAP_PX;
    if (current.length > 0 && used + need > usable) {
      rows.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += need;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

/** Rok ukończenia: z dokładnej daty albo z samego roku; null gdy nieznany. */
export function finishedYearOf(item: Pick<LibraryItem, 'finished_on' | 'finished_year'>): number | null {
  if (item.finished_on) return Number(item.finished_on.slice(0, 4));
  return item.finished_year ?? null;
}

interface TypeCounts {
  books: number;
  videos: number;
  courses: number;
  other: number;
  total: number;
}

export interface ShelfStats {
  year: number;
  thisYear: TypeCounts;
  lifetime: TypeCounts;
}

function emptyCounts(): TypeCounts {
  return { books: 0, videos: 0, courses: 0, other: 0, total: 0 };
}

function addTo(counts: TypeCounts, type: string): void {
  counts.total += 1;
  if (type === 'book') counts.books += 1;
  else if (type === 'video') counts.videos += 1;
  else if (type === 'course') counts.courses += 1;
  else counts.other += 1;
}

export function shelfStats(items: Array<Pick<LibraryItem, 'resource_type' | 'finished_on' | 'finished_year'>>, year: number): ShelfStats {
  const stats: ShelfStats = { year, thisYear: emptyCounts(), lifetime: emptyCounts() };
  for (const item of items) {
    addTo(stats.lifetime, item.resource_type);
    if (finishedYearOf(item) === year) addTo(stats.thisYear, item.resource_type);
  }
  return stats;
}

/** Pozycja „świeża” = dodana w ostatnich 48 h i jeszcze nie pokazana z animacją. */
export function isFresh(item: Pick<LibraryItem, 'id' | 'created_at'>, seen: ReadonlySet<string>, nowMs: number): boolean {
  if (seen.has(item.id)) return false;
  const createdMs = Date.parse(item.created_at);
  return Number.isFinite(createdMs) && nowMs - createdMs >= 0 && nowMs - createdMs <= FRESH_WINDOW_MS;
}

function sortKey(item: Pick<LibraryItem, 'finished_on' | 'finished_year' | 'created_at'>): string {
  if (item.finished_on) return item.finished_on;
  if (item.finished_year) return `${item.finished_year}-07-01`;
  return '0000-00-00';
}

/** Od najstarszych (bez daty na samym początku) do najnowszych: nowa pozycja dostawia się na prawo. */
export function sortForShelf<T extends Pick<LibraryItem, 'finished_on' | 'finished_year' | 'created_at'>>(items: T[]): T[] {
  return [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.created_at.localeCompare(b.created_at));
}

export function formatFinished(item: Pick<LibraryItem, 'finished_on' | 'finished_year'>): string {
  if (item.finished_on) {
    const [year, month, day] = item.finished_on.split('-');
    return `${Number(day)}.${month}.${year}`;
  }
  return item.finished_year ? String(item.finished_year) : 'kiedyś';
}

export type ShelfFilter = 'all' | 'book' | 'video';

export function filterShelf<T extends Pick<LibraryItem, 'resource_type'>>(items: T[], filter: ShelfFilter): T[] {
  return filter === 'all' ? items : items.filter((item) => item.resource_type === filter);
}
