// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineStatusBanner } from './OfflineStatusBanner';

vi.mock('../../lib/offlineQueue', () => ({
  flushOfflineQueue: vi.fn(),
}));

describe('OfflineStatusBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when browser is online initially', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    render(<OfflineStatusBanner />);
    expect(screen.queryByTestId('offline-status-banner')).toBeNull();
  });

  it('renders offline pill when offline event fires', () => {
    render(<OfflineStatusBanner />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-status-banner')).toBeInTheDocument();
    expect(screen.getByText(/tryb offline/i)).toBeInTheDocument();
  });

  it('shows reconnected pill and flushes queue when coming back online', () => {
    vi.useFakeTimers();
    render(<OfflineStatusBanner />);

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/tryb offline/i)).toBeInTheDocument();

    // Go back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText(/połączenie przywrócone/i)).toBeInTheDocument();

    // Fast-forward 2.5s
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByTestId('offline-status-banner')).toBeNull();

    vi.useRealTimers();
  });
});
