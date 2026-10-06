import { afterEach, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { CompanyDetailHeader } from './CompanyDetailHeader';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

afterEach(cleanup);
it('labels a halted quote as historical, links its disclosure and hides current performance', () => {
  const data: CompanyDetailData = {
    ticker: 'WBD', name: 'Warner Bros. Discovery', market: 'us', exchange: '—', sector: '—',
    price: 30.95, priceCurrency: 'USD', priceDate: '2026-10-05', priceSourceUrl: 'https://quotes.test/WBD',
    changeTodayPct: 1, change1yPct: 20, listingStatus: 'halted', listingStatusDate: '2026-10-05',
    listingSourceUrl: 'https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2026-710',
    politicians: { buyersCount: 0, sellsCount: 0, trades: [] },
    insiders: { buysCount: 0, sellsCount: 0, trades: [] },
    prices: [], holdings: [], fundHistory: [], fundChanges: null, description: '',
  };
  const { container } = render(createElement(CompanyDetailHeader, { data, activeTab: 'overview',
    onTabChange: () => {}, isWatched: false, onToggleWatchlist: () => {}, onBack: () => {} }));
  expect(container.textContent).toContain('Ostatnie historyczne notowanie');
  expect(container.textContent).toContain('Obrót wstrzymany 2026-10-05');
  expect(container.textContent).toContain('30,95 USD');
  expect(container.textContent).not.toContain('R/R');
  expect(container.querySelector('a')?.href).toBe(data.listingSourceUrl);
});
