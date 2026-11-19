import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Pressable } from '../ui/ControlPrimitives';
import TodoDetailsPopover from './TodoDetailsPopover';

it('lets the user edit details and dismisses without activating the task underneath', () => {
  const openUnderlyingTask = vi.fn();
  const change = vi.fn();
  function Example() {
    const anchorRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(true);
    return (
      <div ref={anchorRef} onClick={openUnderlyingTask}>
        {open && <TodoDetailsPopover anchorRef={anchorRef} label="Szczegóły" onClose={() => setOpen(false)}>
          <Pressable type="button" onClick={change}>Zmień priorytet</Pressable>
        </TodoDetailsPopover>}
      </div>
    );
  }
  render(<Example />);
  fireEvent.click(screen.getByRole('button', { name: 'Zmień priorytet' }));
  expect(change).toHaveBeenCalledOnce();
  const backdrop = screen.getByRole('button', { name: 'Zamknij edycję zadania' });
  fireEvent.pointerDown(backdrop);
  expect(screen.getByRole('dialog', { name: 'Szczegóły' })).toBeTruthy();
  fireEvent.click(backdrop);
  expect(screen.queryByRole('dialog', { name: 'Szczegóły' })).toBeNull();
  expect(openUnderlyingTask).not.toHaveBeenCalled();
});
