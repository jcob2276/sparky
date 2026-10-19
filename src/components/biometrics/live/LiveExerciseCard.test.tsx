import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LiveExerciseCard from './LiveExerciseCard';
import { newSet, type WorkoutExercise } from '../workout/workoutUtils';

const mockExercise: WorkoutExercise = {
  id: 101,
  name: 'Przysiad sumo',
  tags: ['legs'],
  sets: [newSet()],
};

function renderCard(props: Partial<Parameters<typeof LiveExerciseCard>[0]> = {}) {
  return render(
    <BrowserRouter>
      <LiveExerciseCard
        exercise={mockExercise}
        userId="user-1"
        active
        canMoveUp
        canMoveDown
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onActivate={vi.fn()}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        onSetDone={vi.fn()}
        onAllDone={vi.fn()}
        {...props}
      />
    </BrowserRouter>,
  );
}

describe('LiveExerciseCard', () => {
  it('renders reorder arrows and invokes callbacks on click', () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    renderCard({ onMoveUp, onMoveDown, canMoveUp: true, canMoveDown: true });

    const upBtn = screen.getByRole('button', { name: 'Przesuń Przysiad sumo w górę' });
    const downBtn = screen.getByRole('button', { name: 'Przesuń Przysiad sumo w dół' });

    expect(upBtn).toBeEnabled();
    expect(downBtn).toBeEnabled();

    fireEvent.click(upBtn);
    expect(onMoveUp).toHaveBeenCalledTimes(1);

    fireEvent.click(downBtn);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it('disables up arrow when canMoveUp is false', () => {
    renderCard({ canMoveUp: false, canMoveDown: true });
    const upBtn = screen.getByRole('button', { name: 'Przesuń Przysiad sumo w górę' });
    expect(upBtn).toBeDisabled();
  });

  it('adds an empty set when clicking Dodaj serię', () => {
    const onChange = vi.fn();
    renderCard({ onChange });

    const addSetBtn = screen.getByRole('button', { name: 'Dodaj serię' });
    fireEvent.click(addSetBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as WorkoutExercise;
    expect(updated.sets).toHaveLength(2);
    expect(updated.sets[1].kg).toBe('');
    expect(updated.sets[1].reps).toBe('');
  });

  it('shows Usuń serię only when there are multiple sets and removes the last set', () => {
    const onChange = vi.fn();
    const { rerender } = renderCard({ onChange, exercise: { ...mockExercise, sets: [newSet()] } });

    expect(screen.queryByRole('button', { name: 'Usuń ostatnią serię' })).not.toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <LiveExerciseCard
          exercise={{ ...mockExercise, sets: [newSet(), newSet()] }}
          userId="user-1"
          active
          onActivate={vi.fn()}
          onChange={onChange}
          onRemove={vi.fn()}
          onSetDone={vi.fn()}
          onAllDone={vi.fn()}
        />
      </BrowserRouter>,
    );

    const removeSetBtn = screen.getByRole('button', { name: 'Usuń ostatnią serię' });
    expect(removeSetBtn).toBeInTheDocument();

    fireEvent.click(removeSetBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as WorkoutExercise;
    expect(updated.sets).toHaveLength(1);
  });
});
