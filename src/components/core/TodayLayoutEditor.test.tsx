import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { TodayLayoutEditor } from './TodayLayoutEditor';
import { parseTodayLayout, type TodayLayout } from '../../lib/todayLayout';

afterEach(cleanup);

describe('editing the Today screen', () => {
  it('keeps visibility and ordering in a draft until save, and resets before saving', async () => {
    let stored: TodayLayout | null = null;
    render(<TodayLayoutEditor layout={parseTodayLayout(null)} saving={false}
      onSave={async value => { stored = value; }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj Wizja i sprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Przesuń Najbliższy ruch w górę' }));
    expect(stored).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz układ' }));
    await waitFor(() => expect(stored).not.toBeNull());
    expect(stored!.sections.find(section => section.id === 'vision')?.visible).toBe(false);
    expect(stored!.sections.map(section => section.id)).toEqual(['vision', 'goals', 'plan', 'recovery', 'agenda', 'food', 'snapshot']);
    fireEvent.click(screen.getByRole('button', { name: 'Przywróć domyślny układ' }));
    expect(stored!.sections[0].visible).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz układ' }));
    await waitFor(() => expect(stored!.sections[0].visible).toBe(true));
  });

  it('cancels without saving', () => {
    const save = vi.fn();
    const close = vi.fn();
    render(<TodayLayoutEditor layout={parseTodayLayout(null)} saving={false} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj Jedzenie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(save).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('retains edits on failed save and disables changes while saving', async () => {
    const props = { layout: parseTodayLayout(null), saving: false,
      onSave: async () => { throw new Error('Offline'); }, onClose: vi.fn() };
    const { rerender } = render(<TodayLayoutEditor {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukryj Jedzenie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz układ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByRole('button', { name: 'Pokaż Jedzenie' })).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    rerender(<TodayLayoutEditor {...props} saving />);
    const row = screen.getByRole('listitem', { name: 'Jedzenie' });
    for (const button of within(row).getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zapisz układ' })).toBeDisabled();
  });
});
