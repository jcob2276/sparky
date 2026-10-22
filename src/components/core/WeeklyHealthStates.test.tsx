import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWeeklyBodyPulse } from '../../lib/weeklyBodyPulse';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import { WeeklySpheresOverviewCard } from './WeeklySpheresOverviewCard';

const source = vi.hoisted(() => ({ directionError: null as Error | null, userId: 'owner', query: {
  data: undefined as ReturnType<typeof buildWeeklyBodyPulse> | undefined,
  isLoading: false, isError: false, error: null as Error | null,
} }));
vi.mock('../../lib/biometricsApi', () => ({ useWeeklyBodyPulse: () => source.query }));
vi.mock('../../store/useStore', () => ({ useUserId: () => source.userId }));
vi.mock('../../lib/weeklyWinsMap', () => ({ useWeeklyWinsMap: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock('../lifestyle/direction/hooks/useDirectionContext', () => ({ useDirectionContext: () => ({ weekGoals: null, activeProjects: [], isError: !!source.directionError, error: source.directionError }) }));
beforeEach(() => { vi.clearAllMocks(); source.directionError = null; source.userId = 'owner'; source.query = { data: undefined, isLoading: false, isError: false, error: null }; });
afterEach(cleanup);

describe('weekly health unavailable states', () => {
  it('does not replace a failed project read with a zero project count', () => {
    source.directionError = new Error('projects offline');
    render(<WeeklySpheresOverviewCard />);
    expect(screen.queryByText(/^0 projekt(?:y|ów)?$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Konto/ }));
    expect(screen.getByText('Nie udało się pobrać projektów')).toBeInTheDocument();
    expect(screen.getByText('projects offline')).toBeInTheDocument();
  });
  it('labels warning days by their actual source rather than a sleep norm', () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), warningDays: 3 };
    render(<WeeklyBodyPulse />);
    expect(screen.getByText('3 dni ze statusem ostrzegawczym')).toBeInTheDocument();
    expect(screen.queryByText('3d poniżej normy')).not.toBeInTheDocument();
  });
  it('does not show normal health or zero activity while loading', () => {
    source.query.isLoading = true;
    render(<WeeklyBodyPulse />);
    expect(screen.getByText('Ładuję podsumowanie ciała')).toBeInTheDocument();
    expect(screen.queryByText('W normie')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
  it('shows the failed weekly source instead of a normal badge', () => {
    source.query.isError = true; source.query.error = new Error('workout_sessions: offline');
    render(<WeeklyBodyPulse />);
    expect(screen.getByText(/workout_sessions: offline/)).toBeInTheDocument();
    expect(screen.queryByText('W normie')).not.toBeInTheDocument();
  });
  it('shows an empty sleep card without inventing values after a successful weekly read', () => {
    source.query.data = buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] });
    render(<WeeklyBodyPulse />);
    expect(screen.getByText(/Sen · średnia z 7 dni/)).toBeInTheDocument();
    expect(screen.queryByText('W normie')).not.toBeInTheDocument();
  });
  it('does not turn a failed weekly read into zero workouts in the spheres card', () => {
    source.query.isError = true; source.query.error = new Error('workout_sessions: offline');
    render(<WeeklySpheresOverviewCard />);
    expect(screen.queryByText(/Regeneracja/)).not.toBeInTheDocument();
    expect(screen.getByText('Brak danych')).toBeInTheDocument();
    expect(screen.getByText(/workout_sessions: offline/)).toBeInTheDocument();
  });
});
