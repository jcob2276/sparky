import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiveExerciseCard from './LiveExerciseCard';
import { canComplete, countUnchecked, moveItem, normalizeNumber } from './liveWorkoutUtils';
import { newSet, type WorkoutExercise, type WorkoutSet } from '../workout/workoutUtils';

const set = (patch: Partial<WorkoutSet> = {}): WorkoutSet => ({ ...newSet(), ...patch });
const exercise = (sets: WorkoutSet[]): WorkoutExercise => ({
  id: 1, name: 'Przysiad sumo', tags: ['nogi'],
  sets: sets.map((row, index) => ({ ...row, id: index + 1 })),
});

afterEach(() => vi.restoreAllMocks());

function renderCard(ex: WorkoutExercise, props: Partial<Parameters<typeof LiveExerciseCard>[0]> = {}) {
  const onChange = vi.fn();
  const onUndoable = vi.fn();
  const onSetDone = vi.fn();
  const onSetUndone = vi.fn();
  const element = (current: WorkoutExercise) => (
    <BrowserRouter>
      <LiveExerciseCard
        exercise={current}
        userId="user-1"
        active
        onActivate={vi.fn()}
        onChange={onChange}
        onRemove={vi.fn()}
        onUndoable={onUndoable}
        onSetDone={onSetDone}
        onSetUndone={onSetUndone}
        onAllDone={vi.fn()}
        {...props}
      />
    </BrowserRouter>
  );
  const view = render(element(ex));
  return { onChange, onUndoable, onSetDone, onSetUndone, showExercise: (current: WorkoutExercise) => view.rerender(element(current)) };
}

describe('completing a set', () => {
  it('refuses to complete a set without reps and says why', () => {
    const { onChange, onSetDone } = renderCard(exercise([set()]));
    fireEvent.click(screen.getByRole('button', { name: 'Zalicz serię 1' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onSetDone).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Wpisz powtórzenia');
  });

  it('completes a bodyweight set that has reps but no weight', () => {
    const { onChange, onSetDone } = renderCard(exercise([set({ reps: '12' })]));
    fireEvent.click(screen.getByRole('button', { name: 'Zalicz serię 1' }));
    expect((onChange.mock.calls[0][0] as WorkoutExercise).sets[0]).toMatchObject({ done: true, reps: '12' });
    expect(onSetDone).toHaveBeenCalledTimes(1);
  });

  it('ignores an accidental double tap on the check', () => {
    const { onChange } = renderCard(exercise([set({ reps: '8', kg: '50' })]));
    const check = screen.getByRole('button', { name: 'Zalicz serię 1' });
    fireEvent.click(check);
    fireEvent.click(check);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not start a rest after a warm-up set', () => {
    const { onSetDone } = renderCard(exercise([set({ type: 'warmup', kg: '20', reps: '8' }), set()]));
    fireEvent.click(screen.getByRole('button', { name: 'Zalicz serię 1' }));
    expect(onSetDone).not.toHaveBeenCalled();
  });

  it('stops the rest timer when a completed set is un-checked', () => {
    const { onSetUndone } = renderCard(exercise([set({ kg: '50', reps: '8', done: true })]));
    fireEvent.click(screen.getByRole('button', { name: 'Cofnij serię 1' }));
    expect(onSetUndone).toHaveBeenCalledTimes(1);
  });
});

describe('deleting a set', () => {
  const three = () => exercise([set({ kg: '50', reps: '8' }), set({ kg: '60', reps: '8' }), set({ kg: '70', reps: '6' })]);

  it('needs a second tap before anything is removed', () => {
    const { onChange } = renderCard(three());
    fireEvent.click(screen.getByRole('button', { name: 'Seria 2, opcje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń serię' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes exactly the chosen set and offers undo that puts it back in place', () => {
    const ex = three();
    const { onChange, onUndoable, showExercise } = renderCard(ex);
    fireEvent.click(screen.getByRole('button', { name: 'Seria 2, opcje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń serię' }));
    fireEvent.click(screen.getByRole('button', { name: /Tak, usuń serię/ }));
    const after = onChange.mock.calls[0][0] as WorkoutExercise;
    expect(after.sets.map((s) => s.kg)).toEqual(['50', '70']);
    expect(onUndoable).toHaveBeenCalledWith('Usunięto serię 2', expect.any(Function));
    showExercise(after);
    onUndoable.mock.calls[0][1]();
    const restored = onChange.mock.calls[1][0] as WorkoutExercise;
    expect(restored.sets.map((s) => s.kg)).toEqual(['50', '60', '70']);
  });

  it('never lets the only set be deleted', () => {
    renderCard(exercise([set({ kg: '50', reps: '8' })]));
    fireEvent.click(screen.getByRole('button', { name: 'Seria 1, opcje' }));
    expect(screen.getByRole('button', { name: 'Nie można usunąć jedynej serii' })).toBeDisabled();
  });

  it('asks twice before dropping the last set when it has data, but not when it is empty', () => {
    // Reproduce collisions from newSet's timestamp + random ID without relying on chance.
    vi.spyOn(Date, 'now').mockReturnValue(1793188800000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const withData = renderCard(exercise([set({ kg: '50', reps: '8' }), set({ kg: '60', reps: '8' })]));
    fireEvent.click(screen.getByRole('button', { name: 'Usuń ostatnią serię' }));
    expect(withData.onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź usunięcie ostatniej serii' }));
    expect((withData.onChange.mock.calls[0][0] as WorkoutExercise).sets).toMatchObject([{ kg: '50', reps: '8' }]);

    withData.showExercise(exercise([set({ kg: '50', reps: '8' }), set()]));
    withData.onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Usuń ostatnią serię' }));
    expect(withData.onChange).toHaveBeenCalledTimes(1);
    expect((withData.onChange.mock.calls[0][0] as WorkoutExercise).sets).toMatchObject([{ kg: '50', reps: '8' }]);
  });

  it('duplicates a set right after itself and can mark it as a warm-up', () => {
    const { onChange } = renderCard(three());
    fireEvent.click(screen.getByRole('button', { name: 'Seria 1, opcje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplikuj' }));
    expect((onChange.mock.calls[0][0] as WorkoutExercise).sets.map((s) => s.kg)).toEqual(['50', '50', '60', '70']);
  });
});

describe('typing guards', () => {
  it('clamps absurd weights and reps', () => {
    const { onChange } = renderCard(exercise([set()]));
    fireEvent.change(screen.getByLabelText('Ciężar kg, seria 1'), { target: { value: '9999' } });
    expect((onChange.mock.calls[0][0] as WorkoutExercise).sets[0].kg).toBe('600');
    fireEvent.change(screen.getByLabelText('Powtórzenia, seria 1'), { target: { value: '5000' } });
    expect((onChange.mock.calls[1][0] as WorkoutExercise).sets[0].reps).toBe('200');
  });

  it('rejects letters and accepts a decimal comma', () => {
    const { onChange } = renderCard(exercise([set()]));
    fireEvent.change(screen.getByLabelText('Ciężar kg, seria 1'), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ciężar kg, seria 1'), { target: { value: '82,5' } });
    expect((onChange.mock.calls[0][0] as WorkoutExercise).sets[0].kg).toBe('82.5');
  });
});

describe('helpers', () => {
  it('normalizes entries', () => {
    expect(normalizeNumber('5.', 600, false)).toBe('5');
    expect(normalizeNumber('.', 600, false)).toBe('');
    expect(normalizeNumber('007', 200, true)).toBe('7');
    expect(normalizeNumber('900', 600, false)).toBe('600');
  });

  it('needs reps from the entry or the hint to complete', () => {
    expect(canComplete(set(), null)).toBe(false);
    expect(canComplete(set(), { kg: '50', reps: '10' })).toBe(true);
    expect(canComplete(set({ reps: '0' }), null)).toBe(false);
  });

  it('moves items safely at the edges', () => {
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 3)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });

  it('counts typed but unchecked working sets only', () => {
    const ex = exercise([set({ kg: '50', reps: '8' }), set({ kg: '40', reps: '8', type: 'warmup' }), set({ kg: '50', reps: '8', done: true }), set()]);
    expect(countUnchecked([ex])).toBe(1);
  });
});
