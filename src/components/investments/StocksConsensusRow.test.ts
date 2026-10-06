import { afterEach, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { StocksConsensusRow } from './StocksConsensusRow';
import type { EnrichedStockConsensus } from '../../lib/investments/consensusService';
afterEach(cleanup);

it('displays unpaired holdings as unknown and keeps dated quotes and SEC source links', () => {
  const stock: EnrichedStockConsensus = {
    ticker: 'AAPL', name: 'Apple', sector: '—', priceUsd: 100, priceDate: '2026-10-05',
    changeToday: null, fundsBuying: 0, fundsSelling: 0, totalFunds: 1,
    totalValueRaw: 100, totalValueUsd: '100 USD', netScore: 0, movementType: 'neutral',
    sparkline: [], comparedFunds: 0, reportPeriod: '2026-06-30', previousPeriod: '2026-03-31',
    sourceUrls: ['https://www.sec.gov/Archives/edgar/data/1/a/'],
  };
  const { container } = render(createElement('table', null, createElement('tbody', null,
    createElement(StocksConsensusRow, { stock, isWatched: false,
      onToggleWatchlist: () => {}, onSelectStockForChart: () => {} }))));
  expect(container.textContent).toContain('Brak porównania');
  expect(container.textContent).toContain('2026-10-05');
  expect(container.textContent).not.toContain('0 kupuje');
  expect(container.querySelector('a')?.href).toBe(stock.sourceUrls[0]);
  expect(container.querySelector('td:nth-child(9)')?.textContent).toBe('—');
});
