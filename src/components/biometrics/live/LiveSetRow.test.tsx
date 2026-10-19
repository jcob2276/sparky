import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LiveSetRow from './LiveSetRow';
import type { WorkoutSet } from '../workout/workoutUtils';

const baseSet: WorkoutSet = { id: 1, kg: '', reps: '', rir: '', msp: false };

describe('LiveSetRow', () => {
  it('shows the previous values as hints and completes the set with one tap', () => {
    const onToggleDone = vi.fn();
    render(<LiveSetRow set={baseSet} number={1} ghost={{ kg: '50', reps: '10' }} isNext weightStep={2.5} isPr={false} actionsOpen={false} needsReps={false} onToggleActions={vi.fn()} onChange={vi.fn()} onToggleDone={onToggleDone} />);
    expect(screen.getByLabelText('Ciężar kg, seria 1')).toHaveAttribute('placeholder', '50');
    fireEvent.click(screen.getByRole('button', { name: 'Zalicz serię 1' }));
    expect(onToggleDone).toHaveBeenCalledTimes(1);
  });

  it('nudges the weight from the previous value when nothing is typed', () => {
    const onChange = vi.fn();
    render(<LiveSetRow set={baseSet} number={1} ghost={{ kg: '50', reps: '10' }} isNext weightStep={2.5} isPr={false} actionsOpen={false} needsReps={false} onToggleActions={vi.fn()} onChange={onChange} onToggleDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ciężar plus 2,5' }));
    expect(onChange).toHaveBeenCalledWith({ kg: '52.5' });
  });

  it('shows the record note only on a completed set', () => {
    const { rerender } = render(<LiveSetRow set={baseSet} number={1} ghost={null} isNext={false} weightStep={2.5} isPr actionsOpen={false} needsReps={false} onToggleActions={vi.fn()} onChange={vi.fn()} onToggleDone={vi.fn()} />);
    expect(screen.queryByText(/Nowy rekord/)).not.toBeInTheDocument();
    rerender(<LiveSetRow set={{ ...baseSet, done: true, kg: '100', reps: '5' }} number={1} ghost={null} isNext={false} weightStep={2.5} isPr actionsOpen={false} needsReps={false} onToggleActions={vi.fn()} onChange={vi.fn()} onToggleDone={vi.fn()} />);
    expect(screen.getByText(/Nowy rekord/)).toBeInTheDocument();
  });
});
