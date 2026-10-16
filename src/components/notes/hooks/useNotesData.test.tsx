import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import React from 'react';
import { useNotesData } from './useNotesData';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as notesApi from '../../../lib/notesApi';

const mutations = vi.hoisted(() => ({ update: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./useNotesMutations', () => ({ useNotesMutations: () => ({ handleUpdate: mutations.update }) }));

vi.mock('../../../lib/notesApi', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/notesApi')>('../../../lib/notesApi');
  return {
    ...actual,
    useNotes: vi.fn(),
    useTrashedNotes: vi.fn(),
  };
});

vi.mock('../../../lib/noteFoldersApi', () => ({
  useNoteFolders: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../lib/noteSmartFolders', () => ({
  useNoteSmartFolders: () => ({ data: [], isLoading: false }),
}));

function notesResult(data: notesApi.Note[] | undefined, error: Error | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const query = client.getQueryCache().build<notesApi.Note[], Error>(client, { queryKey: ['fixture'] });
  if (data !== undefined) query.setData(data);
  if (error) query.setState({ status: 'error', data: undefined, error, fetchStatus: 'idle' });
  const result = new QueryObserver<notesApi.Note[], Error>(client, { queryKey: ['fixture'], enabled: false }).getCurrentResult();
  client.clear();
  return result;
}

describe('useNotesData user isolation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('rejects edits of a locked note without an unlock secret instead of falling back to plaintext', async () => {
    const locked: notesApi.Note = {
      id: 'locked', user_id: 'user-1', title: 'Locked', content: '', tags: [], is_locked: true,
      is_pinned: false, is_archived: false, color: 'default', deleted_at: null, folder_id: null,
      created_at: '2026-07-20T00:00:00Z', updated_at: '2026-07-20T00:00:00Z',
      locked_payload: 'encrypted', lock_salt: 'salt', lock_iv: 'iv',
    };
    vi.mocked(notesApi.useNotes).mockReturnValue(notesResult([locked]));
    vi.mocked(notesApi.useTrashedNotes).mockReturnValue(notesResult([]));
    const { result } = renderHook(() => useNotesData('user-1'), { wrapper });
    await expect(result.current.handleUpdate('locked', { content: 'Protected text' })).rejects.toThrow('Sesja zablokowanej notatki wygasła.');
    expect(mutations.update).not.toHaveBeenCalled();
  });

  it('isolates offline storage per userId and clears unlocked state when user switches', () => {
    const user1Notes = [
      {
        id: 'note-u1',
        user_id: 'user-1',
        title: 'User 1 Secret Note',
        content: 'Top secret',
        tags: [],
        is_pinned: false,
        is_archived: false,
        color: 'default',
        created_at: '2026-07-20T00:00:00Z',
        updated_at: '2026-07-20T00:00:00Z',
        deleted_at: null,
        folder_id: null,
        is_locked: false,
        locked_payload: null,
        lock_salt: null,
        lock_iv: null,
      },
    ];

    vi.mocked(notesApi.useNotes).mockReturnValue(notesResult(user1Notes));
    vi.mocked(notesApi.useTrashedNotes).mockReturnValue(notesResult([]));

    const { result, rerender } = renderHook(({ userId }) => useNotesData(userId), {
      wrapper,
      initialProps: { userId: 'user-1' },
    });

    // Check that user-1 cache is persisted to scoped key
    expect(localStorage.getItem(`${STORAGE_KEYS.KEEP_NOTES_LOCAL}_user-1`)).toContain('User 1 Secret Note');
    // Global unscoped key should NOT be written
    expect(localStorage.getItem(STORAGE_KEYS.KEEP_NOTES_LOCAL)).toBeNull();

    // Now switch to user-2 when offline (isError = true, data = undefined)
    vi.mocked(notesApi.useNotes).mockReturnValue(notesResult(undefined, new Error('offline')));

    rerender({ userId: 'user-2' });

    // User-2 offline fallback must NOT leak user-1 notes!
    expect(result.current.notes).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.KEEP_NOTES_LOCAL}_user-2`)).toBeNull();
  });
});
