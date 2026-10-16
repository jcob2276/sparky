import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note } from './keepUtils';
import { useNoteDraftAutosave } from './useNoteDraftAutosave';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  user_id: 'user-1',
  title: 'Title',
  content: '<p>Body</p>',
  color: 'default',
  is_pinned: false,
  is_archived: false,
  tags: ['work'],
  created_at: '2026-07-23T08:00:00.000Z',
  updated_at: '2026-07-23T08:00:00.000Z',
  deleted_at: null,
  folder_id: null,
  is_locked: false,
  locked_payload: null,
  lock_salt: null,
  lock_iv: null,
  ...overrides,
});

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
afterEach(() => vi.useRealTimers());

describe('useNoteDraftAutosave', () => {
  it('saves a changed draft after the debounce delay', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useNoteDraftAutosave({
      note: makeNote(),
      onSave,
      delay: 1_000,
    }));

    act(() => result.current.setContent('<h1>Updated title</h1><p>Body #work </p>'));
    act(() => vi.advanceTimersByTime(999));
    expect(onSave).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onSave).toHaveBeenCalledWith('note-1', {
      title: 'Updated title',
      content: '<h1>Updated title</h1><p>Body #work </p>',
      color: 'default',
      folder_id: null,
      tags: ['work'],
    });
    expect(result.current.saveStatus).toBe('saved');
  });

  it('flushes the old draft before switching notes', () => {
    const onSave = vi.fn();
    const first = makeNote();
    const second = makeNote({ id: 'note-2', title: 'Second', tags: [] });
    const { result, rerender } = renderHook(
      ({ note }) => useNoteDraftAutosave({ note, onSave, delay: 1_000 }),
      { initialProps: { note: first } },
    );

    act(() => result.current.setContent('<p>Changed</p>'));
    rerender({ note: second });

    expect(onSave).toHaveBeenCalledWith('note-1', {
      title: 'Changed',
      content: '<p>Changed</p>',
      color: 'default',
      folder_id: null,
      tags: [],
    });
    expect(result.current.title).toBe('Second');
    expect(result.current.content).toBe('<h1>Second</h1><p>Body</p>');
  });

  it('does not save an unchanged draft on unmount', () => {
    const onSave = vi.fn();
    const { unmount } = renderHook(() => useNoteDraftAutosave({
      note: makeNote(),
      onSave,
      delay: 1_000,
    }));

    unmount();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps a failed draft dirty and allows retrying the save', async () => {
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useNoteDraftAutosave({
      note: makeNote(),
      onSave,
      delay: 1_000,
    }));

    act(() => result.current.setContent('<h1>Needs retry</h1><p>Body #work </p>'));
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(result.current.saveStatus).toBe('error');
    expect(JSON.parse(localStorage.getItem('vanguard_note_draft:note-1') || 'null')).toEqual(
      expect.objectContaining({ title: 'Needs retry' }),
    );

    await act(async () => {
      result.current.retrySave();
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(result.current.saveStatus).toBe('saved');
    expect(localStorage.getItem('vanguard_note_draft:note-1')).toBeNull();
  });

  it('serializes saves and sends the newest draft after an in-flight save', async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<void>(resolve => { resolveSecond = resolve; }));
    const { result } = renderHook(() => useNoteDraftAutosave({
      note: makeNote(),
      onSave,
      delay: 1_000,
    }));

    act(() => result.current.setContent('<p>Version A</p>'));
    act(() => vi.advanceTimersByTime(1_000));
    expect(onSave).toHaveBeenCalledTimes(1);

    act(() => result.current.setContent('<p>Version B</p>'));
    act(() => vi.advanceTimersByTime(1_000));
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst();
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith('note-1', expect.objectContaining({
      content: '<p>Version B</p>',
    }));
    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      resolveSecond();
      await Promise.resolve();
    });
    expect(result.current.saveStatus).toBe('saved');
  });

});

describe('autosave across multiple notes', () => {
  it('does not expose or flush an emergency draft for a locked note', async () => {
    const raw = JSON.stringify({ title: 'Private', content: '<p>Protected draft</p>', color: 'default', tags: [], folder_id: null });
    localStorage.setItem('vanguard_note_draft:note-1', raw);
    const onSave = vi.fn();
    const { result, unmount } = renderHook(() => useNoteDraftAutosave({ note: makeNote({ is_locked: true, content: '', tags: [] }), onSave }));
    expect(result.current.content).not.toContain('Protected draft');
    await act(async () => { await result.current.flushAndWait(); unmount(); });
    expect(onSave).not.toHaveBeenCalled();
    expect(localStorage.getItem('vanguard_note_draft:note-1')).toBe(raw);
  });

  it.each(['broken-json', 'null', '{"title":[],"content":"bad"}'])('ignores an unusable emergency draft (%s)', (raw) => {
    localStorage.setItem('vanguard_note_draft:note-1', raw);
    const { result } = renderHook(() => useNoteDraftAutosave({ note: makeNote(), onSave: vi.fn() }));
    expect(result.current.content).toBe('<h1>Title</h1><p>Body</p>');
    expect(result.current.saveStatus).toBe('idle');
  });

  it('restores an emergency draft on a fresh editor mount and keeps it unsaved until flushed', async () => {
    const draft = { title: 'Odzyskany szkic', content: '<p>Odzyskany szkic</p>', color: 'default', tags: [], folder_id: null };
    localStorage.setItem('vanguard_note_draft:note-1', JSON.stringify(draft));
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useNoteDraftAutosave({ note: makeNote(), onSave }));
    expect(result.current.content).toBe(draft.content);
    expect(result.current.saveStatus).toBe('dirty');
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => { await result.current.flushAndWait(); });
    expect(onSave).toHaveBeenCalledWith('note-1', draft);
    expect(localStorage.getItem('vanguard_note_draft:note-1')).toBeNull();
  });

  it.each(['pending', 'failed'])('reopens its own unsaved draft when a save is %s', async (state) => {
    let finish!: () => void;
    const onSave = state === 'failed' ? vi.fn().mockRejectedValue(new Error('offline'))
      : vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const original = makeNote();
    const { result, rerender } = renderHook(({ note }) => useNoteDraftAutosave({ note, onSave }), { initialProps: { note: original } });
    act(() => result.current.setContent('<p>Niezapisana wersja A</p>'));
    await act(async () => { result.current.flush(); await Promise.resolve(); });
    await act(async () => { rerender({ note: makeNote({ id: 'note-2' }) }); await Promise.resolve(); });
    await act(async () => { rerender({ note: original }); await Promise.resolve(); });
    expect(result.current.content).toBe('<p>Niezapisana wersja A</p>');
    onSave.mockResolvedValue(undefined);
    await act(async () => {
      if (state === 'pending') finish();
      await result.current.flushAndWait();
    });
  });

  it('keeps each note draft under its own id when an earlier save fails', async () => {
    let rejectFirst!: (error: Error) => void;
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectFirst = reject; }))
      .mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ note }) => useNoteDraftAutosave({ note, onSave }),
      { initialProps: { note: makeNote() } },
    );
    act(() => result.current.setContent('<p>Pierwsza notatka</p>'));
    act(() => result.current.flush());
    rerender({ note: makeNote({ id: 'note-2' }) });
    act(() => result.current.setContent('<p>Druga notatka</p>'));
    act(() => result.current.flush());
    await act(async () => { rejectFirst(new Error('offline')); await Promise.resolve(); });
    expect(JSON.parse(localStorage.getItem('vanguard_note_draft:note-1') || 'null'))
      .toMatchObject({ content: '<p>Pierwsza notatka</p>' });
    await act(async () => { await result.current.flushAndWait(); });
    expect(onSave).toHaveBeenCalledWith('note-1', expect.objectContaining({ content: '<p>Pierwsza notatka</p>' }));
    expect(onSave).toHaveBeenCalledWith('note-2', expect.objectContaining({ content: '<p>Druga notatka</p>' }));
    expect(onSave).toHaveBeenCalledTimes(3);
  });

  it('does not drop an intermediate note when switching while a save is pending', async () => {
    let finishFirst!: () => void;
    const onSave = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; })).mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ note }) => useNoteDraftAutosave({ note, onSave }),
      { initialProps: { note: makeNote() } },
    );
    act(() => result.current.setContent('<p>A</p>'));
    rerender({ note: makeNote({ id: 'note-2' }) });
    act(() => result.current.setContent('<p>B</p>'));
    rerender({ note: makeNote({ id: 'note-3' }) });
    act(() => result.current.setContent('<p>C</p>'));
    act(() => result.current.flush());
    await act(async () => { finishFirst(); await Promise.resolve(); });
    expect(onSave).toHaveBeenCalledWith('note-2', expect.objectContaining({ content: '<p>B</p>' }));
    expect(onSave).toHaveBeenCalledWith('note-3', expect.objectContaining({ content: '<p>C</p>' }));
  });
});
