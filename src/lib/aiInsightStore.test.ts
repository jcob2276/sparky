import { describe, expect, it } from 'vitest';
import { isPeriodCompareResponse, isWeekAiInsightResponse } from './aiInsightStore';

describe('type guards zapisanych analiz', () => {
  it('rozpoznaje poprawne wyniki i odrzuca śmieci', () => {
    expect(isPeriodCompareResponse({ comparison: { summary: 'x' }, generatedAt: '2026-10-24T10:00:00Z' })).toBe(true);
    expect(isPeriodCompareResponse({ comparison: {}, generatedAt: 'x' })).toBe(false);
    expect(isPeriodCompareResponse(null)).toBe(false);
    expect(isWeekAiInsightResponse({ insight: { summary: 'x' }, generatedAt: '2026-10-24T10:00:00Z' })).toBe(true);
    expect(isWeekAiInsightResponse({ insight: 'x', generatedAt: 'x' })).toBe(false);
    expect(isWeekAiInsightResponse([])).toBe(false);
  });
});
