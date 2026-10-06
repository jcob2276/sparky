import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { SignalEvidence } from './SignalEvidence';
import { useSignalEvidence } from '../../lib/investments/useSignalEvidence';
vi.mock('../../lib/investments/useSignalEvidence', () => ({ useSignalEvidence: vi.fn() }));
vi.mock('./QuoteChart', () => ({ QuoteChart: () => null }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('renders paired SEC evidence without an invented entry price or discount', () => {
  vi.mocked(useSignalEvidence).mockReturnValue({ data: [{ id: 'fund-1', actor: 'fund', who: 'Fund',
    tone: 'up', badge: 'wzrost raportowanej pozycji', date: '2026-06-30', detail: 'Zmiana stanu raportowanego',
    sourceUrls: ['https://www.sec.gov/previous', 'https://www.sec.gov/current'] }],
    isPending: false, error: null } as ReturnType<typeof useSignalEvidence>);
  const { container } = render(createElement(SignalEvidence, { ticker: 'AMZN', companyName: 'Amazon' }));
  expect(container.textContent).toContain('Stan na:');
  expect(container.textContent).not.toContain('-5.5%');
  expect(container.textContent).not.toContain('taniej');
  expect([...container.querySelectorAll('a')].map(a => a.href)).toEqual([
    'https://www.sec.gov/previous', 'https://www.sec.gov/current']);
});
