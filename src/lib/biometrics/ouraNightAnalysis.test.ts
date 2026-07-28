import { describe, expect, it } from 'vitest';
import { buildOuraNightAnalysis } from './ouraNightAnalysis';

describe('buildOuraNightAnalysis', () => {
  it('explains the night from measured Oura contributors without inventing causality', () => {
    const result = buildOuraNightAnalysis({
      date: '2026-07-28',
      readiness_score: 72,
      readiness_contributors: {
        sleep_balance: 55,
        hrv_balance: 62,
        body_temperature: 91,
        resting_heart_rate: 87,
      },
    }, []);

    expect(result.state).toBe('measured');
    expect(result.drivers[0]).toMatchObject({
      key: 'sleep_balance',
      score: 55,
      direction: 'down',
      source: 'Oura',
    });
    expect(result.drivers.at(-1)?.key).toBe('body_temperature');
    expect(result.summary).toContain('bilans snu');
  });

  it('forecasts tomorrow from personal observations and returns an honest range', () => {
    const history = [80, 82, 84, 81, 83, 82, 84].map((score, index) => ({
      date: `2026-07-${20 + index}`,
      readiness_score: score,
      readiness_contributors: null,
    }));
    const result = buildOuraNightAnalysis(history.at(-1)!, history, 12);

    expect(result.forecast.state).toBe('estimated');
    expect(result.forecast.confidence).toBe('medium');
    expect(result.forecast.low).toBeLessThan(result.forecast.estimate!);
    expect(result.forecast.high).toBeGreaterThan(result.forecast.estimate!);
  });

  it('shows calibration rather than zero when evidence is missing', () => {
    const result = buildOuraNightAnalysis(null, []);

    expect(result.state).toBe('calibrating');
    expect(result.drivers).toEqual([]);
    expect(result.forecast.estimate).toBeNull();
    expect(result.forecast.reason).toContain('nocy');
  });
});
