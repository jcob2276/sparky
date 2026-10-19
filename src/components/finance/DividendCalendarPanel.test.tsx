import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DividendCalendarPanel from './DividendCalendarPanel';
import { DividendAddForm } from './DividendAddForm';

function enterDividend(ticker = 'TEST', amount = '2.5', shares = '20') {
  fireEvent.change(screen.getByPlaceholderText(/Ticker/), { target: { value: ticker } });
  fireEvent.change(screen.getByPlaceholderText('Dywidenda/akcja PLN'), { target: { value: amount } });
  fireEvent.change(screen.getByPlaceholderText('Liczba akcji'), { target: { value: shares } });
  const dateInput = document.querySelector('input[type="date"]')!;
  fireEvent.change(dateInput, { target: { value: '2027-02-12' } });
  fireEvent.submit(dateInput.closest('form')!);
}

describe('manual dividend calculation', () => {
  it('starts without invented holdings or safety scores and calculates only entered payouts', () => {
    render(<DividendCalendarPanel />);
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    expect(screen.queryByText(/82\/100/)).not.toBeInTheDocument();
    expect(screen.getByText('Brak wpisanych dywidend')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj Dywidendę' }));
    enterDividend();
    expect(screen.getByText('TEST', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('+50 PLN')).toBeInTheDocument();
    expect(screen.queryByText(/Safety:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż Brutto' }));
    expect(screen.getByText('50 PLN')).toBeInTheDocument();
  });

  it.each([
    ['   ', '2.5', '20'],
    ['TEST', '-1', '20'],
    ['TEST', '2.5', '0'],
  ])('rejects invalid dividend input (%s, %s, %s)', (ticker, amount, shares) => {
    const onAdd = vi.fn();
    render(<DividendAddForm onAdd={onAdd} />);
    enterDividend(ticker, amount, shares);
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/Ticker/)).toHaveValue(ticker);
  });
});
