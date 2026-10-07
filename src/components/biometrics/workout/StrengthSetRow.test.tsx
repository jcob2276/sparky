import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrengthSetRow } from './StrengthSetRow';
import type { WorkoutSet } from './workoutUtils';
import type { ExerciseHistoryRow } from '../../../lib/health/workout';

afterEach(cleanup);

function renderSet(overrides: Partial<WorkoutSet> = {}, historyRow?: ExerciseHistoryRow, isTimed = false) {
  function Harness() {
    const [set, setSet] = useState<WorkoutSet>({ id: 1, kg: '70', reps: '8', rir: '2', msp: false, ...overrides });
    return <StrengthSetRow set={set} idx={0} historyRow={historyRow} allTimeBest1RM={null}
      haptics={{ light: vi.fn() }} onFillSet={vi.fn()} removeSet={vi.fn()} isTimed={isTimed}
      updateSet={(_id, field, value) => setSet(previous => ({ ...previous, [field]: value }))} />;
  }
  render(<Harness />);
}

describe('StrengthSetRow quick entry', () => {
  it('adjusts weight and reps without opening a text field', () => {
    renderSet();
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ ciężar, seria 1' }));
    expect(screen.getByLabelText('Ciężar, seria 1')).toHaveValue('72.5');
    fireEvent.click(screen.getByRole('button', { name: 'Zmniejsz powtórzenia, seria 1' }));
    expect(screen.getByLabelText('Powtórzenia, seria 1')).toHaveValue('7');
  });

  it('starts an empty weight from history but treats an entered zero as zero', () => {
    const history = { weight: 70, reps: 8, rir: 2 } as ExerciseHistoryRow;
    renderSet({ kg: '' }, history);
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ ciężar, seria 1' }));
    expect(screen.getByLabelText('Ciężar, seria 1')).toHaveValue('72.5');
    fireEvent.change(screen.getByLabelText('Ciężar, seria 1'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ ciężar, seria 1' }));
    expect(screen.getByLabelText('Ciężar, seria 1')).toHaveValue('2.5');
  });

  it('accepts a decimal comma and normalizes it for workout calculations', () => {
    renderSet();
    fireEvent.change(screen.getByLabelText('Ciężar, seria 1'), { target: { value: '72,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ ciężar, seria 1' }));
    expect(screen.getByLabelText('Ciężar, seria 1')).toHaveValue('75');
  });

  it('keeps weight nonnegative and RIR within the supported range', () => {
    renderSet({ kg: '0', rir: '5' });
    fireEvent.click(screen.getByRole('button', { name: 'Zmniejsz ciężar, seria 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ zapas, seria 1' }));
    expect(screen.getByLabelText('Ciężar, seria 1')).toHaveValue('0');
    expect(screen.getByLabelText('Zapas (RIR), seria 1')).toHaveValue('5');
    fireEvent.change(screen.getByLabelText('Zapas (RIR), seria 1'), { target: { value: '9' } });
    fireEvent.blur(screen.getByLabelText('Zapas (RIR), seria 1'));
    expect(screen.getByLabelText('Zapas (RIR), seria 1')).toHaveValue('5');
  });

  it('adjusts seconds for a timed set', () => {
    renderSet({ reps: '30' }, undefined, true);
    fireEvent.click(screen.getByRole('button', { name: 'Zwiększ czas, seria 1' }));
    expect(screen.getByLabelText('Czas (s), seria 1')).toHaveValue('31');
  });
});
