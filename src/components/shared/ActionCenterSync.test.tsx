import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { usePendingActionCount } from '../../hooks/usePendingActionCount';
import { ActionCenterSheet } from './ActionCenterSheet';
import WeekHub from '../lifestyle/WeekHub';

const source = vi.hoisted(() => ({ pending: [{
  id: 'one', title: 'Decyzja do podjęcia', body: 'Opis', payload: {}, status: 'pending', proposal_type: 'friction_cluster', created_at: '2026-10-16',
}] }));
vi.mock('../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('../../lib/actionCenterApi', () => ({
  fetchActionCenterCount: async () => source.pending.length, fetchPendingClarificationRequests: async () => [],
}));
vi.mock('../../lib/systemProposals', () => ({
  fetchPendingProposals: async () => source.pending,
  syncFrictionProposals: async () => {},
  resolveProposal: async () => { source.pending = []; },
}));
vi.mock('../lifestyle/direction/hooks/useDirectionContext', () => ({ useDirectionContext: () => ({ weekStart: null, reload: vi.fn() }) }));
vi.mock('../../hooks/useSpineGuidance', () => ({ useSpineGuidance: () => ({ guidance: null }) }));
vi.mock('../../lib/goal/goalSpine', () => ({ quickCompleteOverdueWeeklyReview: vi.fn() }));
vi.mock('./WeekLoopSummary', () => ({ default: () => null }));
vi.mock('../lifestyle/WeeklyBalanceHexagon', () => ({ default: () => null }));
vi.mock('../biometrics/workout/TrainingPlanContainer', () => ({ default: () => null }));
vi.mock('../biometrics/workout/HealthCoachWeeklyReview', () => ({ default: () => null }));

function Counter() {
  const { count } = usePendingActionCount();
  return <span>Oczekujących: {count}</span>;
}

it('updates the weekly list and header count after resolving a proposal in the action sheet', async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
    <Counter /><WeekHub /><ActionCenterSheet open onClose={vi.fn()} />
  </QueryClientProvider>);
  await waitFor(() => expect(screen.getAllByText('Decyzja do podjęcia')).toHaveLength(2));
  expect(await screen.findByText('Oczekujących: 1')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Istotne' }).at(-1)!);
  await waitFor(() => expect(screen.queryByText('Decyzja do podjęcia')).not.toBeInTheDocument());
  expect(await screen.findByText('Oczekujących: 0')).toBeInTheDocument();
});
