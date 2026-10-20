import { describe, expect, it } from 'vitest';
import {
  chunkRows,
  filterShelf,
  finishedYearOf,
  formatFinished,
  hashTitle,
  isFresh,
  shelfStats,
  sortForShelf,
  spineFor,
  type LibraryItem,
} from './shelfModel';

const item = (patch: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'a', user_id: 'u', title: 'Książka', author: null, resource_type: 'book', pages: 240,
  finished_on: '2026-10-20', finished_year: null, rating: null, source: 'manual', assignment_id: null,
  created_at: '2026-10-20T10:00:00Z', ...patch,
});

describe('spineFor', () => {
  it('wygląd jest stabilny dla tytułu i różny między tytułami', () => {
    expect(spineFor(item({ title: 'Dune' }))).toEqual(spineFor(item({ title: 'Dune' })));
    expect(hashTitle('Dune')).not.toBe(hashTitle('Neuromancer'));
  });
  it('grubość książki rośnie ze stronami i jest ograniczona', () => {
    const thin = spineFor(item({ pages: 60 })).widthPx;
    const thick = spineFor(item({ pages: 600 })).widthPx;
    const huge = spineFor(item({ pages: 5000 })).widthPx;
    expect(thin).toBeLessThan(thick);
    expect(huge).toBeLessThanOrEqual(40);
    expect(thin).toBeGreaterThanOrEqual(16);
  });
  it('książka bez stron ma średnią grubość', () => {
    expect(spineFor(item({ pages: null })).widthPx).toBe(26);
  });
  it('film to płaskie pudełko, artykuł to cienka broszura, kurs wygląda jak książka', () => {
    expect(spineFor(item({ resource_type: 'video' })).kind).toBe('case');
    expect(spineFor(item({ resource_type: 'article' })).kind).toBe('booklet');
    expect(spineFor(item({ resource_type: 'course' })).kind).toBe('book');
  });
  it('odcień mieści się w 0-359', () => {
    for (const title of ['a', 'Zażółć gęślą jaźń', 'x'.repeat(200)]) {
      const { hue } = spineFor(item({ title }));
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe('chunkRows', () => {
  const spines = (widths: number[]) => widths.map((widthPx, id) => ({ id, spine: { kind: 'book' as const, widthPx, heightPx: 130, hue: 0 } }));
  it('żaden rząd nie przekracza szerokości kontenera i nic nie ginie', () => {
    const rows = chunkRows(spines(Array(20).fill(30)), 200);
    for (const row of rows) expect(row.reduce((sum, r) => sum + r.spine.widthPx + 3, 0)).toBeLessThanOrEqual(200);
    expect(rows.flat()).toHaveLength(20);
  });
  it('zachowuje kolejność', () => {
    expect(chunkRows(spines([20, 20, 20, 20, 20, 20]), 130).flat().map((r) => r.id)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('bardzo wąski kontener nie zapętla się, pusta lista to zero półek, szeroki grzbiet zawsze się mieści', () => {
    expect(chunkRows(spines([40, 40]), 10).length).toBeGreaterThan(0);
    expect(chunkRows([], 300)).toEqual([]);
    expect(chunkRows(spines([200, 200]), 150).flat()).toHaveLength(2);
  });
});

describe('rok, statystyki, filtr', () => {
  it('rok z dokładnej daty albo z samego roku, null gdy nieznany', () => {
    expect(finishedYearOf(item({ finished_on: '2019-05-01' }))).toBe(2019);
    expect(finishedYearOf(item({ finished_on: null, finished_year: 2015 }))).toBe(2015);
    expect(finishedYearOf(item({ finished_on: null }))).toBeNull();
  });
  it('liczy w tym roku i całe życie, pozycje bez daty tylko w „całe życie”', () => {
    const stats = shelfStats([
      item({ resource_type: 'book' }), item({ resource_type: 'video' }), item({ resource_type: 'course' }),
      item({ resource_type: 'book', finished_on: null, finished_year: 2015 }),
      item({ resource_type: 'book', finished_on: null }),
      item({ resource_type: 'podcast', finished_on: '2026-01-01' }),
    ], 2026);
    expect(stats.thisYear).toEqual({ books: 1, videos: 1, courses: 1, other: 1, total: 4 });
    expect(stats.lifetime).toEqual({ books: 3, videos: 1, courses: 1, other: 1, total: 6 });
  });
  it('filtr wybiera książki albo filmy', () => {
    const all = [item({ resource_type: 'book' }), item({ resource_type: 'video' }), item({ resource_type: 'course' })];
    expect(filterShelf(all, 'book')).toHaveLength(1);
    expect(filterShelf(all, 'video')).toHaveLength(1);
    expect(filterShelf(all, 'all')).toHaveLength(3);
  });
});

describe('isFresh', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  it('świeża tylko gdy dodana w 48 h i nieobejrzana', () => {
    expect(isFresh(item({ created_at: '2026-10-20T12:00:00Z' }), new Set(), now)).toBe(true);
    expect(isFresh(item({ created_at: '2026-10-18T11:00:00Z' }), new Set(), now)).toBe(false);
    expect(isFresh(item({ id: 'x', created_at: '2026-10-21T10:00:00Z' }), new Set(['x']), now)).toBe(false);
  });
  it('data z przyszłości nie jest świeża', () => {
    expect(isFresh(item({ created_at: '2026-10-23T12:00:00Z' }), new Set(), now)).toBe(false);
  });
});

describe('sortForShelf / formatFinished', () => {
  it('bez daty na początku, potem rok, potem dokładne daty; ten sam dzień wg czasu dodania', () => {
    const sorted = sortForShelf([
      item({ id: 'new', finished_on: '2026-10-20' }),
      item({ id: 'year', finished_on: null, finished_year: 2015 }),
      item({ id: 'none', finished_on: null }),
      item({ id: 'old', finished_on: '2019-01-05' }),
      item({ id: 'same-late', finished_on: '2026-10-20', created_at: '2026-10-21T00:00:00Z' }),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['none', 'year', 'old', 'new', 'same-late']);
  });
  it('formatuje datę, sam rok i brak daty', () => {
    expect(formatFinished(item({ finished_on: '2026-10-05' }))).toBe('5.10.2026');
    expect(formatFinished(item({ finished_on: null, finished_year: 2015 }))).toBe('2015');
    expect(formatFinished(item({ finished_on: null }))).toBe('kiedyś');
  });
});
