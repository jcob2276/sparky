import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewForm from './ReviewForm';
import type { DueReview } from '../../lib/goal/reviewCycle';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';

const due: DueReview = {
  kind: 'week',
  key: 'week:2026-11-02',
  periodStart: '2026-11-02',
  periodEnd: '2026-11-08',
  label: 'Tydzień 2 listopada – 8 listopada',
  nextStart: '2026-11-09',
  nextEnd: '2026-11-15',
};

type Props = Partial<React.ComponentProps<typeof ReviewForm>>;

const renderForm = (props: Props = {}) =>
  render(
    <ReviewForm due={due} context={undefined} facts={[]} gaps={[]} saving={false} remaining={0} onSubmit={vi.fn()} {...props} />,
  );

const next = (name: string | RegExp = 'Dalej') => fireEvent.click(screen.getByRole('button', { name }));

/** Lustro → trzy filary z ocenami → kontrakt. */
const rateAll = () => {
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Duch 5' }));
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Konto 8' }));
  next('Do kontraktu');
};

const setGoals = () => {
  fireEvent.change(screen.getByLabelText(/Ciało: jedna rzecz/), { target: { value: 'Trzy treningi' } });
  fireEvent.change(screen.getByLabelText(/Duch: jedna rzecz/), { target: { value: 'Codzienne głosówki' } });
  fireEvent.change(screen.getByLabelText(/Konto: jedna rzecz/), { target: { value: 'Odnowić zgodę banku' } });
};

describe('ReviewForm', () => {
  it('nie pozwala przejść dalej bez oceny filaru i podpowiada, której brakuje', () => {
    renderForm();
    next();
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeDisabled();
    expect(screen.getByText('Wybierz ocenę: Ciało')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeEnabled();
  });

  it('nie pozwala zamknąć bez trzech celów i wymienia brakujące', () => {
    renderForm();
    rateAll();
    const submit = screen.getByRole('button', { name: 'Zamknij i ustaw cele' });
    expect(submit).toBeDisabled();
    expect(screen.getByText('Brakuje celów: Ciało, Duch, Konto')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ciało: jedna rzecz/), { target: { value: 'Trzy treningi' } });
    expect(screen.getByText('Brakuje celów: Duch, Konto')).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it('wstecz wraca do poprzedniego filaru i zachowuje ocenę', () => {
    renderForm();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByRole('button', { name: 'Ciało 7' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('przekazuje oceny, cele i notatkę, gdy wszystko jest uzupełnione', () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    rateAll();
    setGoals();
    fireEvent.change(screen.getByLabelText(/Jedno zdanie/), { target: { value: 'Dobry tydzień' } });
    next('Zamknij i ustaw cele');
    expect(onSubmit).toHaveBeenCalledWith({
      scores: { cialo: 7, duch: 5, konto: 8 },
      goals: { cialo: 'Trzy treningi', duch: 'Codzienne głosówki', konto: 'Odnowić zgodę banku' },
      note: 'Dobry tydzień',
      goalStatus: {},
    });
  });

  it('zapisuje rozliczenie poprzedniego celu tylko dla filarów, które ten cel miały', () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit, context: { previousGoals: { cialo: 'Trzy treningi' }, weekScores: [] } });
    next();
    fireEvent.click(screen.getByRole('button', { name: /Częściowo/ }));
    expect(screen.getByRole('button', { name: /Częściowo/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Duch 5' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Konto 8' }));
    next('Do kontraktu');
    setGoals();
    next('Zamknij i ustaw cele');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ goalStatus: { cialo: 'partial' } }));
  });

  it('na pierwszym ekranie pokazuje liczby i luki, a w nagłówku liczbę zaległych przeglądów', () => {
    renderForm({ facts: ['Zadania: 20/30'], gaps: ['Przegląd: czeka'], remaining: 2 });
    expect(screen.getByText('Zadania: 20/30')).toBeInTheDocument();
    expect(screen.getByText(/Luki w danych: Przegląd: czeka/)).toBeInTheDocument();
    expect(screen.getByText(/jeszcze 2 po tym/)).toBeInTheDocument();
    expect(screen.getByText('1. Lustro')).toHaveAttribute('aria-current', 'step');
  });

  it('miesiąc bez danych pokazuje krótkie wprowadzenie zamiast pustej strony', () => {
    renderForm({ due: { ...due, kind: 'month' }, context: { previousGoals: null, weekScores: [] } });
    expect(screen.getByText(/Zamykasz: Tydzień 2 listopada/)).toBeInTheDocument();
  });

  it('na ekranie filaru pokazuje poprzedni cel, średnią z tygodni i historię ocen z trendem', () => {
    const context: ReviewContext = {
      previousGoals: { cialo: 'Treningi 3x' },
      weekScores: [{ weekStart: '2026-10-26', scores: { cialo: 5 } }],
      lastWeekScores: { cialo: 5, duch: 6, konto: 7 },
      monthAgoScores: { cialo: 4, duch: 5, konto: 6 },
      sprintGoals: { label: 'Sprint 4 · tydz. 3/12', goals: { cialo: 'Trzy treningi tygodniowo' }, summary: null },
      tasks: {
        done: [{ id: '1', title: 'Trening góra', done: true, category: 'cialo' }],
        missed: [{ id: '2', title: 'Wysłać fakturę', done: false, category: 'praca' }],
      },
    };
    renderForm({ context });
    next();
    expect(screen.getByText('Treningi 3x')).toBeInTheDocument();
    expect(screen.getByText('Trzy treningi tygodniowo')).toBeInTheDocument();
    expect(screen.getByText('Trening góra')).toBeInTheDocument();
    expect(screen.getByText(/Tydzień temu:/)).toBeInTheDocument();
    expect(screen.getByText(/Miesiąc temu:/)).toBeInTheDocument();
    expect(screen.getByText('średnio w tygodniach: 5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ciało 7' }));
    expect(screen.getByText(/\+2 ↗/)).toBeInTheDocument();
  });

  it('lustro pokazuje trzy kafle, pasek 7 dni z najlepszym dniem i rozwijane wydatki', () => {
    const context: ReviewContext = {
      previousGoals: null,
      weekScores: [],
      tasks: {
        done: [{ id: '1', title: 'Trening', done: true, category: 'cialo', date: '2026-11-03' }],
        missed: [{ id: '2', title: 'Calls', done: false, category: null, date: '2026-11-03' }],
      },
      expenses: { total: 1200, count: 5, categories: [{ category: 'Jedzenie', total: 800, count: 3 }], topExpenses: [{ id: 'tx1', title: 'Biedronka', amount: 350, date: '2026-11-04' }] },
      days: [
        { date: '2026-11-02', score: 5, sleepHours: 6, bedtime: '00:10', bedtimeMinutes: 1450, tasksDone: 1, tasksTotal: 5, phoneMinutes: null, hasNote: false },
        { date: '2026-11-03', score: 8, sleepHours: 7.5, bedtime: '22:40', bedtimeMinutes: 1360, tasksDone: 4, tasksTotal: 5, phoneMinutes: null, hasNote: true },
      ],
    };
    renderForm({ context });
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('6,5')).toBeInTheDocument();
    expect(screen.getByText(/Najlepszy: wt/)).toBeInTheDocument();

    // Plan dzień po dniu: zgodność z filarami i lista zadań wybranego dnia
    expect(screen.getByText(/Na cele pracowało/)).toBeInTheDocument();
    expect(screen.getByText('Trening')).toBeInTheDocument();
    expect(screen.getAllByText('bez filaru').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'pn' }));
    expect(screen.getByText('Nic nie rozpisałeś na ten dzień.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Wydatki 1.*200 zł/ }));
    expect(screen.getByText('Biedronka')).toBeInTheDocument();
  });
});
