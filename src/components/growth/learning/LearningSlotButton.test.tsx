import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LearningSlotButton from './LearningSlotButton';
import { makeAssignment } from './learningTestUtils';

const TODAY = '2026-10-21';

describe('LearningSlotButton', () => {
  it('pokazuje dzisiejszy zakres i czas, a kliknięcie woła zapis', () => {
    const onToggle = vi.fn();
    render(<LearningSlotButton assignment={makeAssignment()} today={TODAY} loggedToday={0} busy={false} onToggle={onToggle} />);
    expect(screen.getByText(/str\. 41–59/)).toBeInTheDocument();
    expect(screen.getByText(/ok\. 48 min/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Zrobione na dziś' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('po odhaczeniu pokazuje stan „zrobione” i pozwala cofnąć, zakres się nie przesuwa', () => {
    render(<LearningSlotButton assignment={makeAssignment({ done: 59 })} today={TODAY} loggedToday={19} busy={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/str\. 41–59/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cofnij dzisiejszy postęp' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('skończona pozycja pokazuje „Skończone” bez przycisku', () => {
    render(<LearningSlotButton assignment={makeAssignment({ done: 240, status: 'done' })} today={TODAY} loggedToday={0} busy={false} onToggle={vi.fn()} />);
    expect(screen.getByText('Skończone')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('zaległość po terminie jest wyraźnie oznaczona', () => {
    render(<LearningSlotButton assignment={makeAssignment({ due_date: '2026-10-15' })} today={TODAY} loggedToday={0} busy={false} onToggle={vi.fn()} />);
    expect(screen.getByText('Zaległość na dziś')).toBeInTheDocument();
  });
});
