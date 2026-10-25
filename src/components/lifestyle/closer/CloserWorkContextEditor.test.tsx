import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CloserWorkContextEditor from './CloserWorkContextEditor';
import CloserDayInputs from './CloserDayInputs';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
const row: CloserDailyLogRow = { id: 'day', user_id: 'u', date: '2026-10-25', dials: 7, appointments: 2,
  sales_calls: 3, sales_closed: 1, work_hours: 1.5, notes: 'Mało snu', numbers_entered_at: null, work_energy: 2, work_pressure: 4, created_at: '', updated_at: '' };
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe('personal work context', () => {
  it('saves the note, keeps previously stored ratings untouched, and retains a failed draft', () => {
    const save = vi.fn();
    const props = { userId: 'u', date: row.date, row, saving: false, error: false, onSave: save };
    const view = render(<CloserWorkContextEditor {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz kontekst' }));
    expect(save).toHaveBeenCalledWith({ work_energy: 2, work_pressure: 4, notes: '' });
    view.rerender(<CloserWorkContextEditor {...props} error />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    view.unmount();
    render(<CloserWorkContextEditor {...props} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByText('Energia w pracy')).not.toBeInTheDocument();
  });
  it('keeps unsaved context scoped to the owner and date', () => {
    const props = { userId: 'u', date: row.date, row, saving: false, error: false, onSave: vi.fn() };
    const view = render(<CloserWorkContextEditor {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mój szkic' } });
    view.unmount();
    const next = render(<CloserWorkContextEditor {...props} userId="other" />);
    expect(screen.getByRole('textbox')).toHaveValue('Mało snu');
    next.unmount();
    render(<CloserWorkContextEditor {...props} date="2026-10-24" />);
    expect(screen.getByRole('textbox')).toHaveValue('Mało snu');
  });
  it('prevents manual corrections below recorded calls and duration', () => {
    const save = vi.fn();
    render(<CloserDayInputs dateStr={row.date} log={row} recorded={{ calls: 3, hours: 1.5 }} onUpdate={save} />);
    expect(screen.getByRole('button', { name: 'Zmniejsz: Rozmowy sprzedażowe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Odejmij 30 minut pracy' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ: Umówienia' }));
    expect(save).toHaveBeenCalledWith({ appointments: 3 });
  });
});
