import { expect, it } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { CompanyPiotroskiCard } from './CompanyPiotroskiCard';

it('does not assign an unsupported score to a known company or ETF', () => {
  for (const ticker of ['NVDA', 'XTB', 'CSPX', 'UNKNOWN']) {
    const { container } = render(createElement(CompanyPiotroskiCard, { ticker }));
    expect(container.textContent).not.toMatch(/[0-9]\/9|Top 10%|Top 25%/);
    expect(container.textContent).toContain('Brak zweryfikowanych danych');
    cleanup();
  }
});
