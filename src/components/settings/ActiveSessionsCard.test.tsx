import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchActiveSessions, type ActiveSession } from '../../lib/authSessionsApi';
import ActiveSessionsCard from './ActiveSessionsCard';

vi.mock('../../lib/authSessionsApi', () => ({ fetchActiveSessions: vi.fn() }));
const current: ActiveSession = {
  id: 'current', is_current: true, ip: '192.0.2.1',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  created_at: '2026-11-07T08:00:00Z', last_refreshed_at: '2026-11-07T10:30:00Z',
};
const phone: ActiveSession = {
  id: 'phone', is_current: false, ip: null,
  user_agent: 'Mozilla/5.0 (Linux; Android 15; Phone Build/X; wv) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
  created_at: null, last_refreshed_at: null,
};

function show(userId = 'owner') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ActiveSessionsCard userId={userId} />
  </QueryClientProvider>);
}

beforeEach(() => { vi.mocked(fetchActiveSessions).mockReset(); });

it('shows real session count, current browser, Android app, IP and Warsaw refresh time', async () => {
  vi.mocked(fetchActiveSessions).mockResolvedValue([current, phone]);
  show();
  const list = await screen.findByRole('list', { name: 'Zalogowane sesje' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Zalogowane sesje:')).toHaveTextContent('2');
  const rows = within(list).getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('Edge · Windows');
  expect(rows[0]).toHaveTextContent('Ta sesja');
  expect(rows[0]).toHaveTextContent('IP: 192.0.2.1');
  expect(rows[0]).toHaveTextContent('07.11.2026 · 11:30');
  expect(rows[1]).toHaveTextContent('Aplikacja · Android');
  expect(rows[1]).not.toHaveTextContent('Ta sesja');
  expect(rows[1]).toHaveTextContent('IP: Brak danych');
  expect(rows[1]).toHaveTextContent('Logowanie: —');
});

it('does not claim zero sessions while the server has not answered', async () => {
  let finish!: (sessions: ActiveSession[]) => void;
  vi.mocked(fetchActiveSessions).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  show();
  expect(screen.getByText('Zalogowane sesje:')).toHaveTextContent('—');
  expect(screen.queryByText('Brak aktywnych sesji.')).not.toBeInTheDocument();
  await act(async () => { finish([]); });
  expect(await screen.findByText('Brak aktywnych sesji.')).toBeInTheDocument();
});

it('refreshes the list and replaces stale success with an error when the refresh fails', async () => {
  vi.mocked(fetchActiveSessions).mockResolvedValueOnce([current]);
  show();
  expect(await screen.findByText('Edge · Windows')).toBeInTheDocument();
  vi.mocked(fetchActiveSessions).mockRejectedValueOnce(new Error('unavailable'));
  fireEvent.click(screen.getByRole('button', { name: 'Odśwież aktywne sesje' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać');
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.getByText('Zalogowane sesje:')).toHaveTextContent('—');
  vi.mocked(fetchActiveSessions).mockResolvedValueOnce([phone]);
  fireEvent.click(screen.getByRole('button', { name: 'Odśwież aktywne sesje' }));
  expect(await screen.findByText('Aplikacja · Android')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('does not request session data without a signed-in user', () => {
  show('');
  expect(fetchActiveSessions).not.toHaveBeenCalled();
});
