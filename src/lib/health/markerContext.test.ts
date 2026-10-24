import { describe, expect, it } from 'vitest';
import { buildMarkerContext, contextKindFor, contextWindow, type MarkerContextRows } from './markerContext';

const rows: MarkerContextRows = {
  runKm: [{ date: '2026-09-20', value: 10 }, { date: '2026-10-05', value: 14 }, { date: '2026-07-01', value: 30 }],
  strengthDates: ['2026-10-01', '2026-10-08', '2026-06-01'],
  sleep: [
    { date: '2026-10-10', hours: 7.5, hrv: 60 },
    { date: '2026-10-12', hours: 5.2, hrv: 50 },
    { date: '2026-08-01', hours: 9, hrv: 90 },
  ],
  nutrition: [
    { date: '2026-10-10', calories: 2400, protein: 150 },
    { date: '2026-10-11', calories: 700, protein: 20 },
    { date: '2026-10-12', calories: 2000, protein: 110 },
  ],
};

describe('contextKindFor', () => {
  it('rozpoznaje markery żelaza, hormonów i metabolizmu, resztę pomija', () => {
    expect(contextKindFor('ferritin', 'Ferrytyna')).toBe('iron');
    expect(contextKindFor('tsh', 'TSH')).toBe('hormone');
    expect(contextKindFor('ldl_cholesterol_calculated', 'LDL')).toBe('metabolic');
    expect(contextKindFor('crp', 'CRP')).toBeNull();
  });
});

describe('buildMarkerContext', () => {
  it('okno kończy się w dniu badania i liczy tylko dane z okna', () => {
    expect(contextWindow('iron', '2026-10-15')).toEqual({ from: '2026-08-21', to: '2026-10-15' });
    const ctx = buildMarkerContext('iron', rows, '2026-10-15', '2026-10-24');
    expect(ctx.lines[0]).toContain('24 km');
    expect(ctx.lines[1]).toContain('2 sesji');
  });

  it('sen: średnia z nocy w oknie i liczba krótkich nocy', () => {
    const ctx = buildMarkerContext('hormone', rows, '2026-10-15', '2026-10-24');
    expect(ctx.lines[0]).toContain('6,4 h');
    expect(ctx.lines[0]).toContain('1 krótszych');
  });

  it('jedzenie pomija dzień poniżej 1000 kcal, brak danych to jasny komunikat', () => {
    const ctx = buildMarkerContext('metabolic', rows, '2026-10-15', '2026-10-24');
    expect(ctx.lines[0]).toContain('2 200 kcal'.replace(' ', ''));
    expect(buildMarkerContext('metabolic', { ...rows, nutrition: [] }, '2026-10-15', '2026-10-24').lines[0]).toContain('brak pełnych dni');
  });
});
