import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MIN_FULL_DAY_KCAL } from '@vanguard/domain';
import { computeWeekBalance } from '../../../lib/health/weekBalance';
import WeekBalanceStrip from './WeekBalanceStrip';

afterEach(cleanup);

describe('WeekBalanceStrip', () => {
  it('przy małym niepotwierdzonym zapisie ostrzega o niepełności zamiast oferować dzienną pulę', () => {
    const week = computeWeekBalance({
      weekStart: '2026-10-19', today: '2026-10-20',
      eatenByDate: { '2026-10-19': MIN_FULL_DAY_KCAL - 1 }, targetByDate: {}, fallbackTarget: 2400,
    });
    if (!week) throw new Error('Fixture requires a weekly target');
    render(<WeekBalanceStrip week={week} />);
    expect(screen.getByText(/Orientacyjnie zostało/)).toBeInTheDocument();
    expect(screen.getByText(/niepełnym zapisem/)).toBeInTheDocument();
    expect(screen.queryByText(/\/dzień przez/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Brak wpisów/)).not.toBeInTheDocument();
  });

  it('przy potwierdzonym poście nadal pokazuje dzienną pulę', () => {
    const week = computeWeekBalance({
      weekStart: '2026-10-19', today: '2026-10-20', eatenByDate: {}, targetByDate: {},
      fallbackTarget: 2400, completenessByDate: { '2026-10-19': 'complete' },
    });
    if (!week) throw new Error('Fixture requires a weekly target');
    render(<WeekBalanceStrip week={week} />);
    expect(screen.getByText(/\/dzień przez/)).toBeInTheDocument();
    expect(screen.queryByText(/Orientacyjnie/)).not.toBeInTheDocument();
  });
});
