import { describe, expect, it } from 'vitest';
import { formatIsoDatePl, isWithinYearFloor, latestTradeDate, tradeEventDate } from './investmentsApi';

describe('investmentsApi retention helpers', () => {
  it('prefers filing date over transaction date', () => {
    expect(tradeEventDate({ filing_date: '2026-03-02', transaction_date: '2026-02-01' })).toBe('2026-03-02');
    expect(tradeEventDate({ filing_date: null, transaction_date: '2026-02-01T10:00:00Z' })).toBe('2026-02-01');
    expect(tradeEventDate({ filing_date: null, transaction_date: null })).toBeNull();
  });

  it('drops records older than the year floor and keeps undated ones', () => {
    const floor = '2026-01-01';
    expect(isWithinYearFloor({ filing_date: '2025-12-31', transaction_date: null }, floor)).toBe(false);
    expect(isWithinYearFloor({ filing_date: '2026-01-01', transaction_date: null }, floor)).toBe(true);
    expect(isWithinYearFloor({ filing_date: null, transaction_date: null }, floor)).toBe(true);
  });

  it('finds the latest event date', () => {
    expect(latestTradeDate([])).toBeNull();
    expect(
      latestTradeDate([
        { filing_date: '2026-02-01', transaction_date: null },
        { filing_date: null, transaction_date: '2026-05-09' },
        { filing_date: '2026-03-01', transaction_date: null },
      ]),
    ).toBe('2026-05-09');
  });

  it('formats ISO dates as DD.MM.RRRR', () => {
    expect(formatIsoDatePl('2026-05-09')).toBe('09.05.2026');
  });
});
