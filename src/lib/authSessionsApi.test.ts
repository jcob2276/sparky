import { beforeEach, expect, it, vi } from 'vitest';
import { revokeOtherSessions, revokeSession, type SessionActivity } from './authSessionsApi';

const api = vi.hoisted(() => ({ rpc: vi.fn(), signOut: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc: api.rpc, auth: { signOut: api.signOut } } }));
const session: SessionActivity = {
  id: 'session-id', user_agent: null, ip: null, created_at: null, last_refreshed_at: null,
  is_current: true, status: 'active', ended_at: null, authentication_methods: ['password'],
};
beforeEach(() => vi.clearAllMocks());

it('logs out only this device for the current session', async () => {
  api.signOut.mockResolvedValue({ error: null });
  await revokeSession(session);
  expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(api.rpc).not.toHaveBeenCalled();
});

it('uses the server-scoped session id for another session and rejects a failed revocation', async () => {
  api.rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
  await expect(revokeSession({ ...session, is_current: false })).rejects.toThrow('Nie udało się wylogować sesji');
  expect(api.rpc).toHaveBeenCalledWith('revoke_my_session', { p_session_id: 'session-id' });
  expect(api.signOut).not.toHaveBeenCalled();
});

it('preserves the current device when logging out the others', async () => {
  api.signOut.mockResolvedValue({ error: null });
  await revokeOtherSessions();
  expect(api.signOut).toHaveBeenCalledWith({ scope: 'others' });
});
