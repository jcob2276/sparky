import { expect, it } from 'vitest';
import { watchlistTickersForMarket } from './marketSymbol';

it('filters explicit market suffixes while preserving legacy bare entries', () => {
  const keys = [' abc.us ', 'ABC.WA', 'CDR.PL', 'NVDA'];
  expect([...watchlistTickersForMarket(keys, 'USA')]).toEqual(['ABC', 'NVDA']);
  expect([...watchlistTickersForMarket(keys, 'GPW')]).toEqual(['ABC', 'CDR', 'NVDA']);
});
