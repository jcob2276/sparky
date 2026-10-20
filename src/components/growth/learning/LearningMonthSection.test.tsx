import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LearningMonthSection from './LearningMonthSection';
import { makeAssignment } from './learningTestUtils';

const base = {
  monthStart: '2026-10-01',
  today: '2026-10-21',
  assignments: [],
  loggedToday: {},
  skillLabels: {},
  loading: false,
  error: null,
  busyId: null,
  onToggleToday: vi.fn(),
  onDrop: vi.fn(),
  onAdd: vi.fn(),
};

describe('LearningMonthSection', () => {
  it('pusty miesiąc zachęca do wyboru materiału', () => {
    const onAdd = vi.fn();
    render(<LearningMonthSection {...base} onAdd={onAdd} />);
    expect(screen.getByText('Ten miesiąc (październik)')).toBeInTheDocument();
    expect(screen.getByText('Nic nie jest zaplanowane na ten miesiąc.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Wybierz materiał/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('pokazuje karty pozycji z postępem, umiejętnością i terminem', () => {
    render(<LearningMonthSection {...base} assignments={[makeAssignment({ skill_id: 's1' })]} skillLabels={{ s1: 'Negocjacje i granice' }} />);
    expect(screen.getByText('Never Split the Difference')).toBeInTheDocument();
    expect(screen.getByText(/Książka · Negocjacje i granice · do 31\.10/)).toBeInTheDocument();
    expect(screen.getByText(/40 \/ 240 stron · 17%/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Postęp: Never Split/ })).toHaveAttribute('aria-valuenow', '17');
  });

  it('po osiągnięciu limitu trzech pozycji blokuje dodawanie', () => {
    const three = [1, 2, 3].map((n) => makeAssignment({ id: `a${n}`, title: `Pozycja ${n}` }));
    render(<LearningMonthSection {...base} assignments={three} />);
    expect(screen.getByRole('button', { name: /Dodaj/ })).toBeDisabled();
  });

  it('odhaczenie i odpuszczenie przekazują właściwą pozycję', () => {
    const onToggleToday = vi.fn();
    const onDrop = vi.fn();
    const item = makeAssignment();
    render(<LearningMonthSection {...base} assignments={[item]} onToggleToday={onToggleToday} onDrop={onDrop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zrobione na dziś' }));
    expect(onToggleToday).toHaveBeenCalledWith(item);
    fireEvent.click(screen.getByRole('button', { name: /Odpuść: Never Split/ }));
    expect(onDrop).toHaveBeenCalledWith(item);
  });

  it('pokazuje błąd odczytu zamiast pustego stanu z zachętą', () => {
    render(<LearningMonthSection {...base} error={new Error('offline')} />);
    expect(screen.getByText('Nie udało się wczytać planu nauki')).toBeInTheDocument();
  });
});
