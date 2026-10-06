import { expect, it } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { CompanyFundHoldingsTable } from './CompanyFundHoldingsTable';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

it('shows an unpaired report as unknown rather than an unchanged holding', () => {
  const data = { ticker: 'NVDA', holdings: [{
    investorId: 'fund', investorName: 'Fund', fundName: 'Fund', period: '2026-06-30',
    sharesNow: 100, sharesDelta: null, valueNow: 20000, changeType: 'uncompared',
    previousPeriod: null, sourceUrls: ['https://www.sec.gov/Archives/report'],
  }] } as CompanyDetailData;
  const { container } = render(createElement(CompanyFundHoldingsTable, { data }));
  expect(container.textContent).toContain('Brak porównania');
  expect(container.textContent).not.toContain('Bez zmian');
  expect(container.querySelector('a')?.getAttribute('href')).toContain('www.sec.gov/Archives/');
  expect(container.textContent).toContain('Nie jest potwierdzeniem transakcji');
  cleanup();
});
