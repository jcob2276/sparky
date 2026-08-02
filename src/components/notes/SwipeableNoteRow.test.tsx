// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SwipeableNoteRow from './SwipeableNoteRow';

describe('SwipeableNoteRow', () => {
  it('reveals destructive actions without deleting on swipe', () => {
    const onDelete = vi.fn();
    render(<SwipeableNoteRow
      isPinned={false}
      onTogglePin={vi.fn()}
      onMove={vi.fn()}
      onDelete={onDelete}
    ><div>Notatka</div></SwipeableNoteRow>);
    const row = screen.getByTestId('swipeable-note-row');
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 80, clientY: 104 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 80, clientY: 104 });

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Usuń' })).toBeVisible();
  });

  it('does not capture a vertical scroll gesture', () => {
    render(<SwipeableNoteRow
      isPinned={false}
      onTogglePin={vi.fn()}
      onMove={vi.fn()}
      onDelete={vi.fn()}
    ><div>Notatka</div></SwipeableNoteRow>);
    const row = screen.getByTestId('swipeable-note-row');
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 104, clientY: 160 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 104, clientY: 160 });
    expect(screen.queryByRole('button', { name: 'Usuń' })).toBeNull();
  });
});
