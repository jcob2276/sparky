import { describe, expect, it } from 'vitest';
import { getSprintInfoForDate } from '@vanguard/domain';

describe('getSprintInfoForDate', () => {
  it('liczy sprint 3 w październiku od kotwicy 1 marca', () => {
    expect(getSprintInfoForDate('2026-10-24')).toEqual({
      personalYear: 2026, sprintNumber: 3, weekInSprint: 10, dayInSprint: 69, daysLeft: 14, pct: 82,
      sprintStart: '2026-08-16', sprintEnd: '2026-11-07', prevStart: '2026-05-24', prevEnd: '2026-08-15',
    });
  });
  it('przed 1 marca należy jeszcze do poprzedniego roku osobistego', () => {
    const info = getSprintInfoForDate('2026-02-10');
    expect(info.personalYear).toBe(2025);
    expect(info.sprintNumber).toBe(5);
  });
  it('pierwszy sprint nie ma poprzedniego', () => {
    expect(getSprintInfoForDate('2026-03-01')).toMatchObject({ sprintNumber: 1, weekInSprint: 1, prevStart: null, prevEnd: null });
  });
});
