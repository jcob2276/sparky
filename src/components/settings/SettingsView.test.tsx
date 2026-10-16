import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { notify } from '../../lib/notify';
import SettingsView from './SettingsView';

vi.mock('../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../store/useStore', () => ({ useSession: () => ({ user: { id: 'owner' }, access_token: 'token' }) }));
vi.mock('../../hooks/useUserSettings', () => ({
  useUserSettings: () => ({}), useUpdateUserSettings: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../lib/userSettingsApi', () => ({ fetchNutritionProfile: async () => null, upsertNutritionProfile: vi.fn() }));
vi.mock('../../lib/native/platform', () => ({ isNativePlatform: () => false }));
vi.mock('./NativePermissionsCard', () => ({ default: () => null }));
vi.mock('./AiContextSettings', () => ({ default: () => null }));
vi.mock('../../hooks/useSyncActions', () => ({ useSyncActions: () => ({
  syncCalendar: async () => { notify('Google Calendar rozłączony', 'error'); }, startGoogleAuth: vi.fn(),
}) }));

it('preserves synchronization failure feedback without appending a success message', async () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><SettingsView /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Sync teraz' }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('Google Calendar rozłączony', 'error'));
  expect(vi.mocked(notify).mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
});
