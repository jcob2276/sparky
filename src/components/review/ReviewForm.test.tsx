import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewForm from './ReviewForm';
import type { DueReview } from '../../lib/goal/reviewCycle';

const due: DueReview = {
  kind: 'week',
  key: 'week:2026-11-02',
  periodStart: '2026-11-02',
  periodEnd: '2026-11-08',
  label: 'Tydzień 2 listopada – 8 listopada',
  nextStart: '2026-11-09',
  nextEnd: '2026-11-15',
};

const fill = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duch 5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Konto 8' }));
  fireEvent.change(screen.getByLabelText(/Ciało: jedna rzecz/), { target: { value: 'Trzy treningi' } });
  fireEvent.change(screen.getByLabelText(/Duch: jedna rzecz/), { target: { value: 'Codzienne głosówki' } });
  fireEvent.change(screen.getByLabelText(/Konto: jedna rzecz/), { target: { value: 'Odnowić zgodę banku' } });
};

describe('ReviewForm', () => {
  it('nie pozwala zamknąć bez trzech ocen i trzech celów', () => {
    render(<ReviewForm due={due} context={undefined} facts={[]} gaps={[]} saving={false} remaining={0} onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Zamknij i ustaw cele' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
    fireEvent.change(screen.getByLabelText(/Ciało: jedna rzecz/), { target: { value: 'Trzy treningi' } });
    expect(submit).toBeDisabled();
  });

  it('przekazuje oceny, cele i notatkę, gdy wszystko jest uzupełnione', () => {
    const onSubmit = vi.fn();
    render(<ReviewForm due={due} context={undefined} facts={[]} gaps={[]} saving={false} remaining={0} onSubmit={onSubmit} />);
    fill();
    fireEvent.change(screen.getByLabelText(/Jedno zdanie/), { target: { value: 'Dobry tydzień' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij i ustaw cele' }));
    expect(onSubmit).toHaveBeenCalledWith({
      scores: { cialo: 7, duch: 5, konto: 8 },
      goals: { cialo: 'Trzy treningi', duch: 'Codzienne głosówki', konto: 'Odnowić zgodę banku' },
      note: 'Dobry tydzień',
    });
  });

  it('pokazuje poprzedni cel, średnią z tygodni, liczby i luki', () => {
    render(
      <ReviewForm
        due={{ ...due, kind: 'month' }}
        context={{
          previousGoals: { cialo: 'Biegać 3 razy' },
          weekScores: [
            { weekStart: '2026-11-02', scores: { cialo: 6 } },
            { weekStart: '2026-11-09', scores: { cialo: 8 } },
          ],
        }}
        facts={['Zadania: 20/30']}
        gaps={['Przegląd: czeka']}
        saving={false}
        remaining={2}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Cel, który miałeś: Biegać 3 razy')).toBeInTheDocument();
    expect(screen.getByText('średnio w tygodniach: 7')).toBeInTheDocument();
    expect(screen.getByText('Zadania: 20/30')).toBeInTheDocument();
    expect(screen.getByText(/Luki w danych: Przegląd: czeka/)).toBeInTheDocument();
    expect(screen.getByText(/jeszcze 2 po tym/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ciało: jedna rzecz na następne 4 tygodnie/)).toBeInTheDocument();
  });
});
