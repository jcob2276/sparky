import { afterEach, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { DashboardDisclosureStream } from './DashboardDisclosureStream';

afterEach(cleanup);
it('renders the actual SEC document and disclosed filer', () => {
  const sourceUrl = 'https://www.sec.gov/Archives/edgar/example.xml';
  const { container } = render(createElement(DashboardDisclosureStream, {
    items: [{ id: 'sec-test', dateLabel: '6 paź', sourceType: 'FORM 4', ticker: 'ABC',
      description: 'Actual filer: Kupno (P)', amountOrPercent: '—', sourceUrl }], onViewAll: () => {},
  }));
  expect(container.textContent).toContain('Actual filer');
  expect(container.querySelector('a')?.href).toBe(sourceUrl);
});
