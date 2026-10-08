import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ContextMenu from './ContextMenu';
import type { TodoItemRow } from '../../lib/todo/todo';

afterEach(cleanup);
it('escapes the scrolling page and exposes deletion', () => {
  const onDelete = vi.fn();
  const { container } = render(<div className="transform-gpu overflow-hidden">
    <ContextMenu x={200} y={100} item={{ id: 'task', title: 'Test' } as TodoItemRow}
      today="2026-10-08" sections={[]} onClose={vi.fn()} onDelete={onDelete}
      onSetDueDate={vi.fn()} onMoveSection={vi.fn()} onEditStart={vi.fn()}
      onSetPriority={vi.fn()} onDuplicate={vi.fn()} />
  </div>);
  const menu = screen.getByRole('dialog', { name: 'Opcje zadania: Test' });
  expect(container.contains(menu)).toBe(false);
  expect(document.body.contains(menu)).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Usuń zadanie' }));
  expect(onDelete).toHaveBeenCalledOnce();
});

it('focuses actions, supports arrow navigation and restores the trigger on Escape', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const { unmount } = render(<ContextMenu x={20} y={20} item={{ title: 'Test', priority: 'normal' } as TodoItemRow}
    today="2026-10-08" sections={[]} onClose={close} onDelete={vi.fn()}
    onSetDueDate={vi.fn()} onMoveSection={vi.fn()} onEditStart={vi.fn()}
    onSetPriority={vi.fn()} onDuplicate={vi.fn()} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edytuj zadanie' }));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dzisiaj' }));
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Usuń zadanie' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(close).toHaveBeenCalledOnce();
  unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});

it('moves a task through a visible select without requiring hover', () => {
  const move = vi.fn();
  const close = vi.fn();
  render(<ContextMenu x={20} y={20} item={{ title: 'Test', priority: 'normal' } as TodoItemRow}
    today="2026-10-08" sections={[{ id: 'study', name: 'Studia' }]} onClose={close} onDelete={vi.fn()}
    onSetDueDate={vi.fn()} onMoveSection={move} onEditStart={vi.fn()}
    onSetPriority={vi.fn()} onDuplicate={vi.fn()} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Przenieś do sekcji' }), { target: { value: 'study' } });
  expect(move).toHaveBeenCalledWith('study');
  expect(close).toHaveBeenCalledOnce();
});
