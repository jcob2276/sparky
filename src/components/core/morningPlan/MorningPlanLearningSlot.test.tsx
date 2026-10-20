import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningAssignment } from '../../../lib/learning/learningModel';
import { makeAssignment } from '../../growth/learning/learningTestUtils';
import MorningPlanLearningSlot from './MorningPlanLearningSlot';

const state = vi.hoisted(() => ({
  month: {} as Record<string, unknown>,
  mutate: vi.fn(),
}));

vi.mock('../../growth/learning/useLearningPlan', () => ({
  useLearningMonth: () => state.month,
  useLogLearningProgress: () => ({ mutate: state.mutate, isPending: false, variables: undefined }),
}));

function setMonth(assignments: LearningAssignment[], loggedToday: Record<string, number> = {}, extra: Record<string, unknown> = {}) {
  state.month = { today: '2026-10-21', monthStart: '2026-10-01', assignments, loggedToday, isLoading: false, error: null, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
  setMonth([]);
});

describe('MorningPlanLearningSlot', () => {
  it('bez planu przypomina o ustawieniu go w Rozwoju', () => {
    render(<MorningPlanLearningSlot userId="u1" />);
    expect(screen.getByRole('heading', { name: 'Brak planu nauki na ten miesiąc' })).toBeInTheDocument();
  });

  it('pokazuje dzisiejszy slot i zapisuje go jednym kliknięciem', () => {
    setMonth([makeAssignment()]);
    render(<MorningPlanLearningSlot userId="u1" />);
    expect(screen.getByRole('heading', { name: 'Nauka na dziś' })).toBeInTheDocument();
    expect(screen.getByText(/str\. 41–59/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zrobione na dziś' }));
    expect(state.mutate).toHaveBeenCalledWith({ assignmentId: 'a1', date: '2026-10-21', amount: 19 });
  });

  it('odhaczony slot cofa się zerem', () => {
    setMonth([makeAssignment({ done: 59 })], { a1: 19 });
    render(<MorningPlanLearningSlot userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cofnij dzisiejszy postęp' }));
    expect(state.mutate).toHaveBeenCalledWith({ assignmentId: 'a1', date: '2026-10-21', amount: 0 });
  });

  it('pozycja skończona dziś dalej jest widoczna z możliwością cofnięcia', () => {
    setMonth([makeAssignment({ done: 240, status: 'done' })], { a1: 20 });
    render(<MorningPlanLearningSlot userId="u1" />);
    expect(screen.getByRole('button', { name: 'Cofnij dzisiejszy postęp' })).toBeInTheDocument();
  });

  it('pokazuje błąd odczytu i nie udaje braku planu', () => {
    setMonth([], {}, { error: new Error('offline') });
    render(<MorningPlanLearningSlot userId="u1" />);
    expect(screen.getByText('Nie udało się wczytać planu nauki')).toBeInTheDocument();
    expect(screen.queryByText('Brak planu nauki na ten miesiąc')).not.toBeInTheDocument();
  });
});
