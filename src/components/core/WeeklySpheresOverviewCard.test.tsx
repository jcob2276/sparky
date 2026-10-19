import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklySpheresOverviewCard } from './WeeklySpheresOverviewCard';

const mockState = vi.hoisted(() => ({
  userId: 'test-user',
  bodyQuery: {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
  direction: {
    weekStart: '2026-10-12',
    weekGoals: null,
    activeProjects: [] as Array<{ id: string; name: string }>,
    loading: false,
    isError: false,
    error: null as Error | null,
    reload: vi.fn(),
  },
}));

vi.mock('../../store/useStore', () => ({
  useUserId: () => mockState.userId,
}));

vi.mock('../../lib/biometricsApi', () => ({
  useWeeklyBodyPulse: () => mockState.bodyQuery,
}));

vi.mock('../../lib/weeklyWinsMap', () => ({
  useWeeklyWinsMap: () => ({ data: [{ status: 'win' }, { status: 'loss' }], isLoading: false }),
}));

vi.mock('../lifestyle/direction/hooks/useDirectionContext', () => ({
  useDirectionContext: () => mockState.direction,
}));

describe('WeeklySpheresOverviewCard - Direction and Project Error Truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.userId = 'test-user';
    mockState.bodyQuery = {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    };
    mockState.direction = {
      weekStart: '2026-10-12',
      weekGoals: null,
      activeProjects: [],
      loading: false,
      isError: false,
      error: null,
      reload: vi.fn(),
    };
  });

  afterEach(cleanup);

  it('shows loading state for Konto instead of zero projects while direction is loading', () => {
    mockState.direction.loading = true;
    mockState.direction.activeProjects = [];

    render(<WeeklySpheresOverviewCard />);

    expect(screen.getByText('Ładuję dane')).toBeInTheDocument();
    expect(screen.queryByText('0 projektów')).not.toBeInTheDocument();
  });

  it('shows error state and notice instead of pretending zero projects when direction query fails', () => {
    mockState.direction.isError = true;
    mockState.direction.error = new Error('Database connection failed');
    mockState.direction.activeProjects = [];

    render(<WeeklySpheresOverviewCard />);

    // Subtitle must indicate error, not 0 projects
    expect(screen.getByText('Błąd odczytu')).toBeInTheDocument();
    expect(screen.queryByText('0 projektów')).not.toBeInTheDocument();

    // DataStateNotice must be rendered for direction error
    expect(screen.getByText('Dane projektów i kierunku niedostępne')).toBeInTheDocument();
    expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();

    // Opening Konto drawer must not claim "0 aktywnych projektów"
    fireEvent.click(screen.getByRole('button', { name: /Konto/i }));
    expect(screen.queryByText(/0 aktywnych projektów/)).not.toBeInTheDocument();
    expect(screen.getByText(/Nie udało się pobrać projektów/)).toBeInTheDocument();
  });

  it('displays real project counts when direction succeeds', () => {
    mockState.direction.loading = false;
    mockState.direction.isError = false;
    mockState.direction.activeProjects = [{ id: 'p1', name: 'Projekt A' }, { id: 'p2', name: 'Projekt B' }];

    render(<WeeklySpheresOverviewCard />);

    expect(screen.getByText('2 projekty')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Konto/i }));
    expect(screen.getByText(/2 aktywne projekty/)).toBeInTheDocument();
  });

  it('displays real zero projects when query succeeds with empty list', () => {
    mockState.direction.loading = false;
    mockState.direction.isError = false;
    mockState.direction.activeProjects = [];

    render(<WeeklySpheresOverviewCard />);

    expect(screen.getByText('0 projektów')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Konto/i }));
    expect(screen.getByText(/0 aktywnych projektów/)).toBeInTheDocument();
  });

  it('shows one live number per sphere and no sleep or training figures', () => {
    mockState.bodyQuery.data = { averageRecovery: 74, sleepAvgHours: 7.1, gymCount: 2, runCount: 1 } as never;
    render(<WeeklySpheresOverviewCard />);
    expect(screen.getByText('Regeneracja 74')).toBeInTheDocument();
    expect(screen.getByText('1/7 dni 5/5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ciało/i }));
    expect(screen.queryByText(/sen śr/i)).not.toBeInTheDocument();
  });
});
