import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  insert: vi.fn(),
  calls: [] as unknown[],
}));

vi.mock('../supabase', () => ({
  supabase: { from: () => ({ insert: (rows: unknown) => { m.calls.push(rows); return m.insert(rows); } }) },
}));

import { insertLibraryItems } from './libraryApi';
import type { NewLibraryItem } from './libraryImport';

const item = (title: string, extra: Partial<NewLibraryItem> = {}): NewLibraryItem => ({
  title, author: null, resourceType: 'book', pages: null, finishedOn: null, finishedYear: null, rating: null, source: 'paste', ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.calls = [];
  m.insert.mockResolvedValue({ error: null });
});

describe('insertLibraryItems', () => {
  it('mapuje pola i dzieli na paczki po 100', async () => {
    const result = await insertLibraryItems('u1', Array.from({ length: 250 }, (_, i) => item(`T${i}`)));
    expect(result).toEqual({ added: 250, skipped: 0 });
    expect(m.calls.map((rows) => (rows as unknown[]).length)).toEqual([100, 100, 50]);
    expect((m.calls[0] as Array<Record<string, unknown>>)[0]).toMatchObject({ user_id: 'u1', title: 'T0', resource_type: 'book', source: 'paste' });
  });

  it('zapisuje sam rok tylko gdy nie ma dokładnej daty', async () => {
    await insertLibraryItems('u1', [item('A', { finishedYear: 2015 }), item('B', { finishedOn: '2019-05-01', finishedYear: 2015 })]);
    const rows = m.calls[0] as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ finished_on: null, finished_year: 2015 });
    expect(rows[1]).toMatchObject({ finished_on: '2019-05-01', finished_year: null });
  });

  it('duplikat odrzucony przez indeks nie przerywa importu: paczka idzie wiersz po wierszu', async () => {
    m.insert
      .mockResolvedValueOnce({ error: { code: '23505' } })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505' } })
      .mockResolvedValueOnce({ error: null });
    const result = await insertLibraryItems('u1', [item('A'), item('B'), item('C')]);
    expect(result).toEqual({ added: 2, skipped: 1 });
  });

  it('inny błąd bazy przerywa import i jest zgłoszony', async () => {
    m.insert.mockResolvedValueOnce({ error: { code: '42501', message: 'denied' } });
    await expect(insertLibraryItems('u1', [item('A')])).rejects.toMatchObject({ code: '42501' });
  });

  it('pusta lista nie woła bazy', async () => {
    await expect(insertLibraryItems('u1', [])).resolves.toEqual({ added: 0, skipped: 0 });
    expect(m.insert).not.toHaveBeenCalled();
  });
});
