import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { useKeepPageEffects } from './useKeepPageEffects';

it('waits for the user and opens a single draft requested by the native shortcut', async () => {
  const handleNewNote = vi.fn().mockResolvedValue('draft');
  const setEditingId = vi.fn();
  const setSidebarTab = vi.fn();
  const noop = vi.fn();
  const { rerender } = renderHook(({ userId }) => useKeepPageEffects({
    userId, setSidebarTab, search: '', activeTag: null, sidebarTab: 'trash',
    viewMode: 'list', editingId: null, setEditingId,
    setVisibleCount: noop, setColumns: noop, handleNewNote, handleCreate: noop,
  }), {
    initialProps: { userId: '' },
    wrapper: ({ children }) => <MemoryRouter initialEntries={['/keep?new=1']}>{children}</MemoryRouter>,
  });

  expect(handleNewNote).not.toHaveBeenCalled();
  rerender({ userId: 'user' });
  await waitFor(() => expect(setEditingId).toHaveBeenCalledWith('draft'));
  expect(handleNewNote).toHaveBeenCalledOnce();
  expect(setSidebarTab).toHaveBeenCalledWith('notes');
});
