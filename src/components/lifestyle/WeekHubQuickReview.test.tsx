import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeekHubQuickReview from './WeekHubQuickReview';

describe('WeekHubQuickReview', () => {
  it('nie pozwala zapisać pustego przeglądu, a przy odpowiedzi przekazuje wszystkie trzy pola', () => {
    const onSave = vi.fn();
    render(<WeekHubQuickReview weekLabel="2026-11-02" saving={false} onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Zapisz przegląd' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Co poszło dobrze?'), { target: { value: 'Maraton' } });
    fireEvent.change(screen.getByLabelText('Jedna zmiana na następny tydzień'), { target: { value: 'Spać o 22:30' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith({ wentWell: 'Maraton', didNotWork: '', oneChange: 'Spać o 22:30' });
  });

  it('oferuje pełny przegląd tylko, gdy ma dokąd przejść', () => {
    const { rerender } = render(<WeekHubQuickReview weekLabel="x" saving={false} onSave={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Pełny przegląd/ })).not.toBeInTheDocument();
    rerender(<WeekHubQuickReview weekLabel="x" saving={false} onSave={vi.fn()} onStartFullReview={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pełny przegląd/ })).toBeInTheDocument();
  });
});
