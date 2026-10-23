import { expect, it } from 'vitest';
import { baselinePeriod, isBaselinePeriod, reportWindowFilter } from './superinvestorWindow';

it('window covers current year plus the previous Q4 baseline', () => {
  expect(baselinePeriod('2026-10-23')).toBe('2025-12-31');
  expect(reportWindowFilter('2026-10-23')).toBe('period_of_report=gte.2025-12-31');
  expect(isBaselinePeriod('2025-12-31', '2026-10-23')).toBe(true);
  expect(isBaselinePeriod('2026-03-31', '2026-10-23')).toBe(false);
});
