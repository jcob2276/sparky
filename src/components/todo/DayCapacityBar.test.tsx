import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DayCapacityBar from './DayCapacityBar';

vi.mock('../calendar/hooks/useTodayCalendarEvents', () => ({
  useTodayCalendarEvents: () => ({
    events: [],
    loading: false,
    nowMs: Date.now(),
    isActive: () => false,
    isPast: () => false,
  }),
}));

describe('DayCapacityBar user isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves and loads different user capacity settings without overwriting', () => {
    // User A sets 6-hour capacity
    localStorage.setItem(
      'vanguard-day-capacity:user-A',
      JSON.stringify({ start: '09:00', end: '15:00', breakMinutes: 0 }),
    );
    // User B sets 10-hour capacity
    localStorage.setItem(
      'vanguard-day-capacity:user-B',
      JSON.stringify({ start: '08:00', end: '18:00', breakMinutes: 0 }),
    );

    const { rerender } = render(
      <DayCapacityBar userId="user-A" today="2026-10-17" plannedMinutes={120} />,
    );

    // User A has 6h available (360m)
    expect(screen.getByText(/6h/)).toBeInTheDocument();

    // Switch to User B
    rerender(<DayCapacityBar userId="user-B" today="2026-10-17" plannedMinutes={120} />);

    // User B must see their 10h available (600m)
    expect(screen.getByText(/10h/)).toBeInTheDocument();

    // Verify localStorage was not overwritten with User A's data
    const userBSaved = JSON.parse(localStorage.getItem('vanguard-day-capacity:user-B') || '{}');
    expect(userBSaved.end).toBe('18:00');
  });
});
