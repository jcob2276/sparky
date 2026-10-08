import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import BucketHeader from './BucketHeader';
import { confirmDialog } from '../../lib/notify';

vi.mock('../../lib/notify', () => ({ confirmDialog: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('exposes disclosure and rename to keyboard and touch users', () => {
  const rename = vi.fn();
  render(<BucketHeader icon="" title="Studia" count={10} collapsed={false} isDropTarget={false} onToggle={vi.fn()} onRename={rename} />);
  expect(screen.getByRole('button', { name: 'Studia 10' }).getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Zmień nazwę sekcji Studia' }));
  const input = screen.getByRole('textbox', { name: 'Nazwa sekcji' });
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: 'Uczelnia' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(rename).toHaveBeenCalledWith('Uczelnia');
});

it.each([false, true])('deletes only when shared confirmation returns %s', async approved => {
  vi.mocked(confirmDialog).mockResolvedValueOnce(approved);
  const remove = vi.fn();
  render(<BucketHeader icon="" title="Studia" count={10} collapsed={false} isDropTarget={false} onToggle={vi.fn()} onDelete={remove} />);
  fireEvent.click(screen.getByRole('button', { name: 'Usuń sekcję Studia' }));
  await Promise.resolve();
  expect(confirmDialog).toHaveBeenCalledWith(expect.stringContaining('Zadania wrócą do skrzynki'));
  expect(remove).toHaveBeenCalledTimes(approved ? 1 : 0);
});
