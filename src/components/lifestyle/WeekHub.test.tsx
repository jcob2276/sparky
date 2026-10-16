import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import WeekHub from './WeekHub';
import WeekPlanningRecap from './WeekPlanningRecap';

const direction = vi.hoisted(() => ({ hasData: false, weekStart: null as string | null, isError: false, error: null as Error | null }));
beforeEach(() => { direction.hasData = false; direction.weekStart = null; direction.isError = false; direction.error = null; });

vi.mock('../../store/useStore', () => ({ useUserId: () => 'owner' }));
vi.mock('./direction/hooks/useDirectionContext', () => ({ useDirectionContext: () => ({ ...direction, reload: vi.fn() }) }));
vi.mock('../../hooks/useSpineGuidance', () => ({ useSpineGuidance: () => ({ guidance: null }) }));
vi.mock('../../lib/systemProposals', () => ({
  fetchPendingProposals: async () => { throw new Error('offline'); }, syncFrictionProposals: async () => {}, resolveProposal: vi.fn(),
}));
vi.mock('../../lib/goal/goalSpine', () => ({ quickCompleteOverdueWeeklyReview: vi.fn() }));
vi.mock('../shared/WeekLoopSummary', () => ({ default: () => <div data-testid="week-plan-form" /> }));
vi.mock('./ProjectWeekKpis', () => ({ default: () => null }));
vi.mock('./WeeklyBalanceHexagon', () => ({ default: () => null }));
vi.mock('../biometrics/workout/TrainingPlanContainer', () => ({ default: () => null }));
vi.mock('../biometrics/workout/HealthCoachWeeklyReview', () => ({ default: () => null }));

it('shows a read failure instead of silently hiding the weekly decisions', async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><WeekHub /></QueryClientProvider>);
  expect(await screen.findByText('Nie udało się odczytać propozycji tygodnia')).toBeInTheDocument();
});

it('keeps the week editor closed when its existing context could not be read', () => {
  direction.weekStart = '2026-10-12'; direction.isError = true; direction.error = new Error('goal_kpis offline');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><WeekHub /></QueryClientProvider>);
  expect(screen.getByText('Nie udało się odczytać kontekstu tygodnia')).toBeInTheDocument();
  expect(screen.queryByTestId('week-plan-form')).not.toBeInTheDocument();
});

it('does not hide a failed recap as if the week had no projects or goals', () => {
  direction.isError = true; direction.error = new Error('goal_kpis offline');
  render(<WeekPlanningRecap userId="owner" weekStart="2026-10-12" />);
  expect(screen.getByText(/goal_kpis offline/)).toBeInTheDocument();
});
it('retains an already loaded week alongside the refresh error notice', () => {
  direction.hasData = true; direction.weekStart = '2026-10-12'; direction.isError = true; direction.error = new Error('offline');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><WeekHub /></QueryClientProvider>);
  expect(screen.getByTestId('week-plan-form')).toBeInTheDocument();
  expect(screen.getByText('Nie udało się odczytać kontekstu tygodnia')).toBeInTheDocument();
});
