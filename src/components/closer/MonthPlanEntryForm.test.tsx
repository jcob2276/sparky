import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthPlanEntryForm } from './MonthPlanEntryForm';

function setup(overrides: Partial<Parameters<typeof MonthPlanEntryForm>[0]> = {}) {
  const onSave = vi.fn();
  render(
    <MonthPlanEntryForm
      date="2026-11-04"
      minDate="2026-11-02"
      maxDate="2026-11-30"
      initial={{ appointments: 3, salesCalls: 2, salesClosed: 1 }}
      saving={false}
      disabled={false}
      onDateChange={() => undefined}
      onSave={onSave}
      {...overrides}
    />,
  );
  return onSave;
}

describe('MonthPlanEntryForm', () => {
  it('startuje od zapisanych liczb i wysyła zmienione z datą dnia', () => {
    const onSave = setup();
    expect(screen.getByText('close rate dnia 50%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Umówione'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Sales calle'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz dzień' }));
    expect(onSave).toHaveBeenCalledWith('2026-11-04', { appointments: 6, salesCalls: 4, salesClosed: 1 });
  });

  it('nie pozwala zapisać większej liczby sprzedaży niż sales calli', () => {
    const onSave = setup();
    fireEvent.change(screen.getByLabelText('Sprzedaże'), { target: { value: '3' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Sprzedaży nie może być więcej niż sales calli.');
    expect(screen.getByRole('button', { name: 'Zapisz dzień' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blokuje zapis, gdy zapisane liczby jeszcze się nie wczytały', () => {
    setup({ disabled: true });
    expect(screen.getByRole('button', { name: 'Zapisz dzień' })).toBeDisabled();
  });
});
