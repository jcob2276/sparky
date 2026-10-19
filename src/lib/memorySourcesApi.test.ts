import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import { fetchMemorySource, formatMemorySourceDate, parseMemorySourceRefs } from './memorySourcesApi';

afterEach(() => vi.restoreAllMocks());

describe('memory evidence', () => {
  it('keeps readable citations and ignores malformed JSON entries', () => {
    expect(parseMemorySourceRefs([null, {}, { table: 'vanguard_stream', id: 'one', quote: 'Własne słowa', date: null }]))
      .toEqual([{ table: 'vanguard_stream', id: 'one', quote: 'Własne słowa', date: null, date_precision: null }]);
    expect(parseMemorySourceRefs('invalid')).toEqual([]);
  });

  it('never invents a time when only a date or unqualified legacy timestamp is known', () => {
    expect(formatMemorySourceDate('2026-10-18')).toBe('18.10.2026');
    expect(formatMemorySourceDate('2026-10-18T08:30:00Z')).toBe('18.10.2026');
    expect(formatMemorySourceDate('2026-10-18T08:30:00Z', 'timestamp')).toBe('18.10.2026 · 10:30');
    expect(formatMemorySourceDate(null)).toBe('Data nieznana');
    expect(formatMemorySourceDate('not-a-date')).toBe('Data nieznana');
    expect(formatMemorySourceDate('2026-02-31')).toBe('Data nieznana');
  });

  it('does not query arbitrary tables or make unscoped requests', async () => {
    const from = vi.spyOn(supabase, 'from');
    await expect(fetchMemorySource('user-one', { table: 'user_settings', id: 'one' })).resolves.toEqual({ status: 'unsupported' });
    await expect(fetchMemorySource('', { table: 'vanguard_stream', id: 'one' })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it('retrieves the original with both user and record filters', async () => {
    const filters: unknown[][] = [];
    const query = {
      select: () => query,
      eq: (...args: unknown[]) => { filters.push(args); return query; },
      maybeSingle: async () => ({ data: { content: 'Oryginalny wpis', created_at: '2026-10-18T08:30:00Z' }, error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(query as never);
    await expect(fetchMemorySource('user-one', { table: 'vanguard_stream', id: 'one' })).resolves.toMatchObject({
      status: 'available', text: 'Oryginalny wpis', date: '2026-10-18T08:30:00Z', date_precision: 'timestamp',
    });
    expect(filters).toEqual([['user_id', 'user-one'], ['id', 'one']]);
  });

  it('distinguishes deleted or RLS-hidden sources from network errors', async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: vi.fn() };
    vi.spyOn(supabase, 'from').mockReturnValue(query as never);
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchMemorySource('user-one', { table: 'vanguard_stream', id: 'one' })).resolves.toEqual({ status: 'missing' });
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(fetchMemorySource('user-one', { table: 'vanguard_stream', id: 'one' })).rejects.toThrow('offline');
  });
});
