import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWeeklyBodyPulse } from '../../lib/weeklyBodyPulse';
import { notify } from '../../lib/notify';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyPulseDiagnostic from './WeeklyPulseDiagnostic';
import { WeeklySpheresOverviewCard } from './WeeklySpheresOverviewCard';

const source = vi.hoisted(() => ({ directionError: null as Error | null, userId: 'owner', request: vi.fn(), query: {
  data: undefined as ReturnType<typeof buildWeeklyBodyPulse> | undefined,
  isLoading: false, isError: false, error: null as Error | null,
} }));
vi.mock('../../lib/biometricsApi', () => ({ useWeeklyBodyPulse: () => source.query }));
vi.mock('../../store/useStore', () => ({ useUserId: () => source.userId }));
vi.mock('../../lib/supabase', async (importOriginal) => ({ ...await importOriginal<typeof import('../../lib/supabase')>(), invokeEdge: source.request }));
vi.mock('../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../lib/weeklyWinsMap', () => ({ useWeeklyWinsMap: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock('../lifestyle/direction/hooks/useDirectionContext', () => ({ useDirectionContext: () => ({ weekGoals: null, activeProjects: [], isError: !!source.directionError, error: source.directionError }) }));
beforeEach(() => { vi.clearAllMocks(); source.directionError = null; source.userId = 'owner'; source.request.mockReset(); source.query = { data: undefined, isLoading: false, isError: false, error: null }; });
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
  it('releases cancelled account loading state before returning to that account', async () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 7 };
    let resolveOld!: (value: { answer: string }) => void;
    source.request.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    const { rerender } = render(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    source.userId = 'other'; rerender(<WeeklyPulseDiagnostic />);
    await act(async () => { resolveOld({ answer: 'Spóźniona odpowiedź.' }); });
    source.userId = 'owner'; rerender(<WeeklyPulseDiagnostic />);
    expect(screen.getByRole('button', { name: /AI Diagnoza/ })).toBeEnabled();
  });
  it('ignores a late reply belonging to the previous account', async () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 7 };
    let resolveOld!: (value: { answer: string }) => void;
    source.request.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ answer: 'Synteza bieżącego konta.' });
    const { rerender } = render(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    source.userId = 'other'; rerender(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    await screen.findByText('Synteza bieżącego konta.');
    await act(async () => { resolveOld({ answer: 'Spóźniona odpowiedź starego konta.' }); });
    expect(screen.getByText('Synteza bieżącego konta.')).toBeInTheDocument();
    expect(screen.queryByText('Spóźniona odpowiedź starego konta.')).not.toBeInTheDocument();
  });
  it('allows retry after a failed request and displays the actual response', async () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 7 };
    source.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ answer: 123, reply: '  Zapisana odpowiedź Oracle.  ' });
    render(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    await waitFor(() => expect(notify).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    await screen.findByText('Zapisana odpowiedź Oracle.');
    expect(source.request).toHaveBeenCalledTimes(2);
  });
  it('does not show the previous account synthesis after an account switch', async () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 7 };
    source.request.mockResolvedValue({ answer: 'Prywatna synteza pierwszego konta.' });
    const { rerender } = render(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    await screen.findByText('Prywatna synteza pierwszego konta.');
    source.userId = 'other';
    rerender(<WeeklyPulseDiagnostic />);
    expect(screen.queryByText('Prywatna synteza pierwszego konta.')).not.toBeInTheDocument();
  });
  it('does not turn general daily warnings into a sleep deficit', () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 9, averageRecovery: 50, warningDays: 3 };
    render(<WeeklyPulseDiagnostic />);
    expect(screen.queryByText(/Deficyt snu/)).not.toBeInTheDocument();
  });
  it('labels warning days by their actual source rather than a sleep norm', () => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), warningDays: 3 };
    render(<WeeklyBodyPulse />);
    expect(screen.getByText('3 dni ze statusem ostrzegawczym')).toBeInTheDocument();
    expect(screen.queryByText('3d poniżej normy')).not.toBeInTheDocument();
  });
  it('does not claim a stable rhythm when no measurements or active days are recorded', () => {
    source.query.data = buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] });
    render(<WeeklyPulseDiagnostic />);
    expect(screen.getByText('Za mało zapisów do syntezy tygodnia')).toBeInTheDocument();
    expect(screen.queryByText(/Stabilny rytm/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /AI Diagnoza/ })).not.toBeInTheDocument();
  });
  it.each(['failure', 'empty'])('does not replace Oracle %s with invented AI advice', async (mode) => {
    source.query.data = { ...buildWeeklyBodyPulse({ since: '2026-10-10', sessions: [], strava: [], oura: [], strain: [] }), sleepAvgHours: 7, averageRecovery: 75 };
    if (mode === 'failure') source.request.mockRejectedValue(new Error('offline'));
    else source.request.mockResolvedValue({ answer: '   ' });
    render(<WeeklyPulseDiagnostic />);
    fireEvent.click(screen.getByRole('button', { name: /AI Diagnoza/ }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Synteza tygodnia jest teraz niedostępna. Spróbuj ponownie.', 'error'));
    expect(screen.queryByText('Sparky AI Insight')).not.toBeInTheDocument();
    expect(screen.queryByText(/Priorytet tygodnia: zabezpieczyć/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ustabilizuj sen przed północą/)).not.toBeInTheDocument();
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
  it('does not synthesize a stable week when the body query failed', () => {
    source.query.isError = true; source.query.error = new Error('oura_daily_summary: offline');
    render(<WeeklyPulseDiagnostic />);
    expect(screen.getByText(/oura_daily_summary: offline/)).toBeInTheDocument();
    expect(screen.queryByText(/Stabilny rytm 7 dni/)).not.toBeInTheDocument();
  });
  it('does not turn a failed weekly read into zero workouts in the spheres card', () => {
    source.query.isError = true; source.query.error = new Error('workout_sessions: offline');
    render(<WeeklySpheresOverviewCard />);
    expect(screen.queryByText(/Regeneracja/)).not.toBeInTheDocument();
    expect(screen.getByText('Brak danych')).toBeInTheDocument();
    expect(screen.getByText(/workout_sessions: offline/)).toBeInTheDocument();
  });
});
