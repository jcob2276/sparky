import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NoteQuickActions from './NoteQuickActions';

it('keeps the backdrop through pointerdown and consumes the dismissal click', () => {
  const close = vi.fn();
  const openNote = vi.fn();
  const action = vi.fn();
  render(
    <div onClick={openNote}>
      <NoteQuickActions
        note={{
          id: 'one', user_id: 'user', title: 'Notatka', content: '', tags: [], color: 'default',
          is_pinned: false, is_archived: false, is_locked: false, deleted_at: null,
          folder_id: null, locked_payload: null, lock_salt: null, lock_iv: null,
          created_at: '', updated_at: '',
        }}
        onClose={close}
        onTogglePin={action}
        onArchive={action}
        onDelete={action}
      />
    </div>,
  );
  const backdrop = screen.getByRole('button', { name: 'Zamknij akcje notatki' });
  fireEvent.pointerDown(backdrop);
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(backdrop);
  expect(close).toHaveBeenCalledOnce();
  expect(openNote).not.toHaveBeenCalled();
  expect(action).not.toHaveBeenCalled();
});
