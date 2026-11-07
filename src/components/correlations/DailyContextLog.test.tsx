import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DailyContextLog from './DailyContextLog';

const ctx = vi.hoisted(() => ({
  setValue: vi.fn(),
  values: {} as Record<string, number>,
}));

vi.mock('./hooks/useDailyContext', () => ({
  useDailyContext: () => ({
    days: ['2026-11-07', '2026-11-06'],
    today: '2026-11-07',
    loading: false,
    setValue: ctx.setValue,
    valueFor: (date: string, key: string) => ctx.values[`${date}|${key}`] ?? null,
  }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); ctx.values = {}; });

const dayCard = (label: string) => screen.getByText(new RegExp(`^${label}`)).closest('div') as HTMLElement;

describe('DailyContextLog', () => {
  it('pokazuje dziś i wczoraj', () => {
    render(<DailyContextLog />);
    expect(screen.getByText(/^Dziś/)).toBeTruthy();
    expect(screen.getByText(/^Wczoraj/)).toBeTruthy();
  });

  it('jawne "Bez" zapisuje alkohol = 0 dla właściwej daty', () => {
    render(<DailyContextLog />);
    fireEvent.click(within(dayCard('Dziś')).getByRole('button', { name: 'Bez' }));
    expect(ctx.setValue).toHaveBeenCalledWith({ date: '2026-11-07', key: 'alcohol', value: 0 });
  });

  it('ponowne kliknięcie aktywnego wyboru czyści wpis (null)', () => {
    ctx.values['2026-11-06|stress'] = 3;
    render(<DailyContextLog />);
    const active = within(dayCard('Wczoraj')).getByRole('button', { name: '3', pressed: true });
    fireEvent.click(active);
    expect(ctx.setValue).toHaveBeenCalledWith({ date: '2026-11-06', key: 'stress', value: null });
  });

  it('choroba i podróż zapisują 1', () => {
    render(<DailyContextLog />);
    const buttons = within(dayCard('Dziś')).getAllByRole('button', { name: 'Tak' });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(ctx.setValue).toHaveBeenNthCalledWith(1, { date: '2026-11-07', key: 'sick', value: 1 });
    expect(ctx.setValue).toHaveBeenNthCalledWith(2, { date: '2026-11-07', key: 'travel', value: 1 });
  });
});
