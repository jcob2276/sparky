import { describe, expect, it } from 'vitest';
import { sortWikiSources, truncateWikiQuote, type WikiSource } from './wikiSources';
import { formatMemorySourceDate } from './memorySourcesApi';

const source = (id: string, relevance: number, source_date: string | null): WikiSource => ({
  id, relevance, source_date, source_table: 'vanguard_stream', source_id: id, quote: 'Cytat',
});

describe('wiki source previews', () => {
  it('sorts by relevance, then newest instant, with unknown dates last, without mutating input', () => {
    const rows = [source('low', 0.2, '2026-10-28'), source('unknown', 0.9, null),
      source('older', 0.9, '2026-10-27T23:30:00+02:00'), source('newer', 0.9, '2026-10-27T22:00:00Z')];
    expect(sortWikiSources(rows).map(row => row.id)).toEqual(['newer', 'older', 'unknown', 'low']);
    expect(rows[0].id).toBe('low');
  });

  it('limits the sorted result to eight sources', () => {
    const rows = Array.from({ length: 12 }, (_, index) => source(String(index), index, null));
    expect(sortWikiSources(rows).map(row => row.id)).toEqual(['11', '10', '9', '8', '7', '6', '5', '4']);
    expect(sortWikiSources([])).toEqual([]);
  });

  it('keeps short quotes and caps long quotes at 160 characters including the ellipsis', () => {
    expect(truncateWikiQuote(null)).toBe('');
    expect(truncateWikiQuote('Krótki cytat')).toBe('Krótki cytat');
    expect(truncateWikiQuote('a'.repeat(160))).toBe('a'.repeat(160));
    expect(truncateWikiQuote('a'.repeat(161))).toBe(`${'a'.repeat(159)}…`);
    expect(Array.from(truncateWikiQuote('🙂'.repeat(161)))).toHaveLength(160);
  });

  it('formats instants in Warsaw across midnight and daylight saving changes', () => {
    expect(formatMemorySourceDate('2026-07-01T22:30:00Z', 'timestamp')).toBe('02.07.2026 · 00:30');
    expect(formatMemorySourceDate('2026-12-01T23:30:00Z', 'timestamp')).toBe('02.12.2026 · 00:30');
    expect(formatMemorySourceDate('2026-10-25T00:30:00Z', 'timestamp')).toBe('25.10.2026 · 02:30');
    expect(formatMemorySourceDate('2026-10-25T01:30:00Z', 'timestamp')).toBe('25.10.2026 · 02:30');
    expect(formatMemorySourceDate('2026-10-28', 'timestamp')).toBe('28.10.2026');
    expect(formatMemorySourceDate(null, 'timestamp')).toBe('Data nieznana');
  });
});
