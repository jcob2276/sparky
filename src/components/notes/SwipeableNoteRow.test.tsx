// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pressable } from '../ui/ControlPrimitives';
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

  it('swiping right past threshold triggers onTogglePin and resets', () => {
    const onTogglePin = vi.fn();
    render(<SwipeableNoteRow
      isPinned={false}
      onTogglePin={onTogglePin}
      onMove={vi.fn()}
      onDelete={vi.fn()}
    ><div>Notatka</div></SwipeableNoteRow>);
    const row = screen.getByTestId('swipeable-note-row');
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 50, clientY: 100 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 150, clientY: 100 });

    expect(onTogglePin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Przypnij' })).toBeNull();
  });

  it('clicking an action button executes callback and closes row', () => {
    const onDelete = vi.fn();
    render(<SwipeableNoteRow
      isPinned={false}
      onTogglePin={vi.fn()}
      onMove={vi.fn()}
      onDelete={onDelete}
    ><div>Notatka</div></SwipeableNoteRow>);
    const row = screen.getByTestId('swipeable-note-row');
    // swipe left to reveal
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 80, clientY: 100 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 80, clientY: 100 });

    const deleteBtn = screen.getByRole('button', { name: 'Usuń' });
    expect(deleteBtn).toBeVisible();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Usuń' })).toBeNull();
  });

  it('clicking row content when actions are open dismisses the row and intercepts child click', () => {
    const childClick = vi.fn();
    render(<SwipeableNoteRow
      isPinned={false}
      onTogglePin={vi.fn()}
      onMove={vi.fn()}
      onDelete={vi.fn()}
    ><Pressable onClick={childClick}>Wiersz</Pressable></SwipeableNoteRow>);
    const row = screen.getByTestId('swipeable-note-row');
    // swipe left to reveal
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 80, clientY: 100 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 80, clientY: 100 });

    expect(screen.getByRole('button', { name: 'Usuń' })).toBeVisible();

    // click child content
    fireEvent.click(screen.getByRole('button', { name: 'Wiersz' }));

    // child click is intercepted, actions close
    expect(childClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Usuń' })).toBeNull();
  });
});
