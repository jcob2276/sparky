import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { DashboardWatchlistBuilder } from './DashboardWatchlistBuilder';
import { useWatchlistSuggestions } from '../../lib/investments/useWatchlistDetails';
vi.mock('../../lib/investments/useWatchlistDetails', () => ({ useWatchlistSuggestions: vi.fn() }));
afterEach(cleanup);
it('does not promise email or show hardcoded stocks when the source fails', () => {
  vi.mocked(useWatchlistSuggestions).mockReturnValue({ data: undefined, isPending: false,
    error: new Error('HTTP 503') } as ReturnType<typeof useWatchlistSuggestions>);
  const { container } = render(createElement(DashboardWatchlistBuilder, {
    watchlist: [], onToggle: () => {}, onDismiss: () => {},
  }));
  expect(container.textContent).toContain('HTTP 503');
  expect(container.textContent).not.toContain('AMZN');
  expect(container.textContent).not.toContain('e-mail');
});
