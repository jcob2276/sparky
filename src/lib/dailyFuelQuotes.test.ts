import { describe, expect, it } from 'vitest';
import { DAILY_FUEL_QUOTE_LIST } from './dailyFuelQuoteList';
import { getDailyFuelQuote } from './dailyFuelQuotes';

describe('getDailyFuelQuote', () => {
  it('has no duplicate quotes', () => {
    const texts = DAILY_FUEL_QUOTE_LIST.map(([text]) => text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('shows every quote exactly once per cycle', () => {
    const length = DAILY_FUEL_QUOTE_LIST.length;
    const seen = new Set(Array.from({ length }, (_, day) => getDailyFuelQuote(day + 9000).text));
    expect(seen.size).toBe(length);
  });

  it('rarely repeats an author on consecutive days', () => {
    const authorOf = (day: number) => getDailyFuelQuote(day).author?.replace(' (parafraza)', '');
    let repeats = 0;
    for (let day = 0; day < DAILY_FUEL_QUOTE_LIST.length; day += 1) if (authorOf(day) === authorOf(day + 1)) repeats += 1;
    expect(repeats).toBeLessThanOrEqual(3);
  });
});
