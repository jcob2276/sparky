import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { fetchSessionActivity, revokeSession, revokeOtherSessions, type SessionActivity } from '../../lib/authSessionsApi';
import { confirmDialog } from '../../lib/notify';
import ActiveSessionsCard from './ActiveSessionsCard';

vi.mock('../../lib/authSessionsApi', () => ({ fetchSessionActivity: vi.fn(), revokeSession: vi.fn(), revokeOtherSessions: vi.fn() }));
vi.mock('../../lib/notify', () => ({ confirmDialog: vi.fn(), notify: vi.fn() }));
const current: SessionActivity = {
  id: 'current', is_current: true, ip: '192.0.2.1',
  status: 'active', authentication_methods: ['password'], ended_at: null,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  created_at: '2026-11-07T08:00:00Z', last_refreshed_at: '2026-11-07T10:30:00Z',
};
const phone: SessionActivity = {
  id: 'phone', is_current: false, ip: null,
  status: 'active', authentication_methods: ['password'], ended_at: null,
  user_agent: 'Mozilla/5.0 (Linux; Android 15; Phone Build/X; wv) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
  created_at: null, last_refreshed_at: '2026-11-07T10:00:00Z',
};

function show(userId = 'owner') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ActiveSessionsCard userId={userId} />
  </QueryClientProvider>);
}

beforeEach(() => {
  vi.restoreAllMocks(); vi.clearAllMocks(); vi.mocked(fetchSessionActivity).mockReset();
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-07T12:00:00Z'));
});

it('shows real session count, current browser, Android app, IP and Warsaw refresh time', async () => {
  vi.mocked(fetchSessionActivity).mockResolvedValue([current, phone]);
  show();
  const list = await screen.findByRole('list', { name: 'Zalogowane sesje' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Sesje z dostępem:')).toHaveTextContent('2');
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
  let finish!: (sessions: SessionActivity[]) => void;
  vi.mocked(fetchSessionActivity).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  show();
  expect(screen.getByText('Sesje z dostępem:')).toHaveTextContent('—');
  expect(screen.queryByText('Brak aktywnych sesji.')).not.toBeInTheDocument();
  await act(async () => { finish([]); });
  expect(await screen.findByText('Brak aktywnych sesji.')).toBeInTheDocument();
});

it('refreshes the list and replaces stale success with an error when the refresh fails', async () => {
  vi.mocked(fetchSessionActivity).mockResolvedValueOnce([current]);
  show();
  expect(await screen.findByText('Edge · Windows')).toBeInTheDocument();
  vi.mocked(fetchSessionActivity).mockRejectedValueOnce(new Error('unavailable'));
  fireEvent.click(screen.getByRole('button', { name: 'Odśwież aktywne sesje' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać');
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.getByText('Sesje z dostępem:')).toHaveTextContent('—');
  vi.mocked(fetchSessionActivity).mockResolvedValueOnce([phone]);
  fireEvent.click(screen.getByRole('button', { name: 'Odśwież aktywne sesje' }));
  expect(await screen.findByText('Aplikacja · Android')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('does not request session data without a signed-in user', () => {
  show('');
  expect(fetchSessionActivity).not.toHaveBeenCalled();
});

it('separates ended login history from sessions that still have access', async () => {
  vi.mocked(fetchSessionActivity).mockResolvedValue([current, { ...phone, status: 'ended', ended_at: '2026-11-07T11:00:00Z' }]);
  show();
  expect(await screen.findByText('Edge · Windows')).toBeInTheDocument();
  expect(screen.queryByText('Aplikacja · Android')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
  expect(await screen.findByText('Aplikacja · Android')).toBeInTheDocument();
  expect(screen.getByText('Zakończona')).toBeInTheDocument();
  expect(screen.getAllByText('Hasło')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /Wyloguj sesję/ })).not.toBeInTheDocument();
});

it('only removes a session after confirmation and server success; a failure remains visible', async () => {
  vi.mocked(fetchSessionActivity).mockResolvedValue([current, phone]);
  vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  vi.mocked(revokeSession).mockRejectedValueOnce(new Error('Nie udało się wylogować sesji.'));
  show();
  const button = await screen.findByRole('button', { name: 'Wyloguj sesję Aplikacja · Android' });
  fireEvent.click(button);
  await act(async () => {});
  expect(revokeSession).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wylogować');
  expect(screen.getByText('Aplikacja · Android')).toBeInTheDocument();
  vi.mocked(revokeSession).mockResolvedValueOnce();
  vi.mocked(fetchSessionActivity).mockResolvedValue([current, { ...phone, status: 'ended', ended_at: '2026-11-07T11:00:00Z' }]);
  fireEvent.click(button);
  await act(async () => {});
  await screen.findByText('Sesje z dostępem:');
  expect(revokeSession).toHaveBeenLastCalledWith(phone);
  await act(async () => {});
  expect(screen.queryByText('Aplikacja · Android')).not.toBeInTheDocument();
});

it('can revoke other sessions while keeping the current session signed in', async () => {
  vi.mocked(fetchSessionActivity).mockResolvedValue([current, phone]);
  vi.mocked(confirmDialog).mockResolvedValue(true);
  vi.mocked(revokeOtherSessions).mockResolvedValueOnce();
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Wyloguj pozostałe' }));
  await act(async () => {});
  expect(revokeOtherSessions).toHaveBeenCalledOnce();
  expect(screen.getByText('Ta sesja')).toBeInTheDocument();
});
