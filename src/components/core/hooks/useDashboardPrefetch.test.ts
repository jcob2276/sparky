import { describe, expect, it } from 'vitest';
import { isConstrainedConnection } from './useDashboardPrefetch';

describe('isConstrainedConnection', () => {
  it('skips background warm-up when the user asked to save data', () => {
    expect(isConstrainedConnection({ saveData: true, effectiveType: '4g' })).toBe(true);
  });

  it('skips background warm-up on slow cellular links', () => {
    expect(isConstrainedConnection({ effectiveType: 'slow-2g' })).toBe(true);
    expect(isConstrainedConnection({ effectiveType: '2g' })).toBe(true);
    expect(isConstrainedConnection({ effectiveType: '3g' })).toBe(true);
  });

  it('keeps warming up on fast links and when the browser does not report the connection', () => {
    expect(isConstrainedConnection({ saveData: false, effectiveType: '4g' })).toBe(false);
    expect(isConstrainedConnection({})).toBe(false);
    expect(isConstrainedConnection(undefined)).toBe(false);
  });
});
