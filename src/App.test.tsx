import { useState, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { ControlInput } from './components/ui/ControlPrimitives';

const source = vi.hoisted(() => ({ owner: 'first' as string | null }));
vi.mock('./hooks/useAppAuthSession', () => ({ useAppAuthSession: () => ({ session: source.owner ? { user: { id: source.owner } } : null, loading: false }) }));
vi.mock('./lib/native/platform', () => ({ isNativePlatform: () => false }));
vi.mock('./lib/native/initNativeIntents', () => ({ initNativeIntents: async () => {}, registerNativeNavigate: () => {} }));
vi.mock('./lib/native/initNativeShell', () => ({ hideSplashScreen: async () => {} }));
vi.mock('./components/core/Dashboard', () => ({ default: function PrivateDashboard() {
  const [draft, setDraft] = useState('');
  return <ControlInput aria-label="Private draft" value={draft} onChange={(event) => setDraft(event.target.value)} />;
} }));
vi.mock('./components/core/Auth', () => ({ default: () => <div>Sign in</div> }));
vi.mock('./components/settings/SettingsView', () => ({ default: () => null }));
vi.mock('./components/core/OfflineStatusBanner', () => ({ OfflineStatusBanner: () => null }));
vi.mock('./components/core/ActionHistoryController', () => ({ default: () => null }));
vi.mock('./components/ui/ToastHost', () => ({ ToastHost: () => null }));
vi.mock('./components/shared/PageTemplateBoundary', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./components/poker/PokerDecisionPage', () => ({ default: () => <div>Public poker</div> }));
vi.mock('./components/investments/InvestmentsPage', () => ({ default: () => <div>Public investments</div> }));

beforeEach(() => { source.owner = 'first'; window.history.replaceState({}, '', '/'); });
afterEach(cleanup);

it('keeps a private draft for the same owner and removes it on a direct account change', () => {
  const { rerender } = render(<App />);
  fireEvent.change(screen.getByLabelText('Private draft'), { target: { value: 'First account draft' } });
  rerender(<App />);
  expect(screen.getByLabelText('Private draft')).toHaveValue('First account draft');
  source.owner = 'second'; rerender(<App />);
  expect(screen.getByLabelText('Private draft')).toHaveValue('');
});

it.each([['/poker', 'Public poker'], ['/inwestycje', 'Public investments']])('keeps the existing anonymous entry at %s', async (path, label) => {
  source.owner = null; window.history.replaceState({}, '', path);
  render(<App />);
  expect(await screen.findByText(label)).toBeInTheDocument();
  expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
});
