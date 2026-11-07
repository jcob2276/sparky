import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BankTransaction } from '../../lib/finance/bankApi';
import { BankReviewList } from './BankReviewList';

afterEach(cleanup);

const tx = (id: string, name: string | null, amount: number): BankTransaction => ({
  id, account_id: 'a', amount, currency: 'PLN', booking_date: '2026-11-07',
  counterparty_name: name, remittance: null, category: 'do_sprawdzenia',
});

describe('BankReviewList', () => {
  it('nic nie pokazuje, gdy nie ma nic do sprawdzenia', () => {
    const { container } = render(<BankReviewList items={[]} total={0} pending={false} onAssign={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('pokazuje liczbę oczekujących i kontrahentów', () => {
    render(<BankReviewList items={[tx('1', 'PAYPRO S.A.', -121), tx('2', 'NUVEI', -59)]} total={39} pending={false} onAssign={() => {}} />);
    expect(screen.getByText(/Do sprawdzenia · 39/)).toBeTruthy();
    expect(screen.getByText('PAYPRO S.A.')).toBeTruthy();
    expect(screen.getByText('NUVEI')).toBeTruthy();
  });

  it('wybór kategorii wywołuje przypisanie dla właściwej transakcji', () => {
    const onAssign = vi.fn();
    render(<BankReviewList items={[tx('1', 'PAYPRO S.A.', -121)]} total={1} pending={false} onAssign={onAssign} />);
    const select = screen.getByLabelText('Kategoria: PAYPRO S.A.') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'zdrowie' } });
    expect(onAssign).toHaveBeenCalledWith('1', 'zdrowie');
  });

  it('nie oferuje "Do sprawdzenia" jako wyboru', () => {
    render(<BankReviewList items={[tx('1', 'X', -1)]} total={1} pending={false} onAssign={() => {}} />);
    const select = screen.getByLabelText('Kategoria: X') as HTMLSelectElement;
    const values = [...select.options].map((o) => o.value);
    expect(values).not.toContain('do_sprawdzenia');
    expect(values).toContain('inne');
  });
});
