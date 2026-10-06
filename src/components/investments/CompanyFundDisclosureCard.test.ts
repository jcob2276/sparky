import { expect, it } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { CompanyFundDisclosureCard } from './CompanyFundDisclosureCard';

it('does not fabricate quarterly flows from the current value of holdings', () => {
  const { container } = render(createElement(CompanyFundDisclosureCard, { ticker: 'NVDA' }));
  expect(container.querySelector('svg')).toBeNull();
  expect(container.textContent).toContain('Brak zweryfikowanej historii');
  expect(container.textContent).toContain('nie jest kwotą zakupów');
  cleanup();
});

it('renders a real report period and primary document links without relabeling holdings as purchases', () => {
  const { container } = render(createElement(CompanyFundDisclosureCard, { ticker: 'NVDA', history: [{
    period_of_report: '2026-06-30', reported_holders: 2, reported_shares: 100,
    reported_value_usd: 20000, latest_filing_date: '2026-08-10',
    source_urls: ['https://www.sec.gov/Archives/edgar/data/1/000000000126000001/'],
  }] }));
  expect(container.textContent).toContain('2026-06-30');
  expect(container.querySelector('a')?.getAttribute('href')).toContain('www.sec.gov/Archives/');
  expect(container.textContent).not.toContain('Kupujący');
  cleanup();
});

it('shows the reported summary separately from the unchanged sum of positions', () => {
  const { container } = render(createElement(CompanyFundDisclosureCard, { ticker: 'NVDA', history: [{
    period_of_report: '2026-06-30', reported_holders: 1, reported_shares: 100,
    reported_value_usd: 20000, latest_filing_date: '2026-08-10',
    source_urls: ['https://www.sec.gov/Archives/report'],
    summary_warnings: [{ source_url: 'https://www.sec.gov/Archives/report',
      computed_total_usd: 30, reported_total_usd: 31, difference_usd: -1 }],
  }] }));
  expect(container.textContent).toContain('Raporty z rozbieżnością: 1');
  expect(container.textContent).toContain('suma pozycji 30 USD');
  expect(container.textContent).toContain('zgłoszone podsumowanie 31 USD');
  expect(container.textContent).toContain('Wartości pozycji zachowano bez zmian');
  cleanup();
});
