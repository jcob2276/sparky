import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPendingClarificationRequests } from '../../lib/actionCenterApi';
import { fetchPendingProposals, syncFrictionProposals } from '../../lib/systemProposals';
import { ActionCenterSheet } from './ActionCenterSheet';

vi.mock('../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('../../lib/actionCenterApi', () => ({ fetchPendingClarificationRequests: vi.fn() }));
vi.mock('../../lib/systemProposals', () => ({ fetchPendingProposals: vi.fn(), syncFrictionProposals: vi.fn(), resolveProposal: vi.fn() }));

const clients: QueryClient[] = [];
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><ActionCenterSheet open onClose={vi.fn()} /></QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(syncFrictionProposals).mockResolvedValue();
  vi.mocked(fetchPendingProposals).mockResolvedValue([]);
  vi.mocked(fetchPendingClarificationRequests).mockResolvedValue([]);
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); });

describe('pending actions data states', () => {
  it.each(['clarifications', 'proposals'])('shows failure rather than empty state when %s cannot be read', async (source) => {
    if (source === 'clarifications') vi.mocked(fetchPendingClarificationRequests).mockRejectedValue(new Error('offline'));
    else vi.mocked(fetchPendingProposals).mockRejectedValue(new Error('offline'));
    show();
    expect(await screen.findByText('Nie udało się odczytać oczekujących akcji')).toBeInTheDocument();
    expect(screen.queryByText('Brak propozycji ani pytań.')).not.toBeInTheDocument();
  });

  it('shows empty state for a successful empty result', async () => {
    show();
    expect(await screen.findByText('Brak propozycji ani pytań.')).toBeInTheDocument();
  });
});
