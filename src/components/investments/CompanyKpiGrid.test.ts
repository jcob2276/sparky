import { expect, it } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { CompanyKpiGrid } from './CompanyKpiGrid';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

it('uses verified SEC holdings and never presents undated cache changes as purchases', () => {
  const data: CompanyDetailData = {
    market: 'us', ticker: 'NVDA', name: 'Nvidia', exchange: '—', sector: '—',
    price: null, priceCurrency: null, priceDate: null, priceSourceUrl: null,
    changeTodayPct: null, change1yPct: null, holdings: [], prices: [], description: '',
    fundHistory: [{ period_of_report: '2026-06-30', reported_holders: 13, reported_value_usd: 12300000000,
      reported_shares: 100, latest_filing_date: '2026-08-14', source_urls: [] }],
    fundChanges: null,
    politicians: { buyersCount: 0, sellsCount: 0, trades: [] }, insiders: { buysCount: 0, sellsCount: 0, trades: [] },
  };
  const { container } = render(createElement(CompanyKpiGrid, { data }));
  expect(container.textContent).toContain('FUNDUSZY Z POZYCJĄ13');
  expect(container.textContent).toContain('12,3 mld USD');
  expect(container.textContent).toContain('2026-06-30');
  expect(container.textContent).not.toContain('4 kupiło');
  expect(container.textContent).not.toContain('9,6 mld');
  cleanup();
});
