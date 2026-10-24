import { describe, expect, it } from 'vitest';
import { buildMarkerSeries, type MedicalLabRow } from './medicalAnalytics';
import { buildPanelFreshness, buildPersonalInsights, formatAge } from './medicalPersonalOverview';

let seq = 0;
function row(over: Partial<MedicalLabRow> & Pick<MedicalLabRow, 'marker_key' | 'result_date' | 'value'>): MedicalLabRow {
  seq += 1;
  return {
    id: `r${seq}`, marker_name: over.marker_key, category: null, unit: null, ref_low: null, ref_high: null,
    ref_text: null, flag: null, source_name: 'test', provider: null, notes: null, ...over,
  };
}

const TODAY = '2026-10-24';

describe('buildPanelFreshness', () => {
  it('marks groups fresh, stale and missing from the newest marker in each group', () => {
    const series = buildMarkerSeries([
      row({ marker_key: 'tsh', result_date: '2026-08-19', value: 2.6, category: 'Tarczyca' }),
      row({ marker_key: 'ldl', result_date: '2025-04-25', value: 132, category: 'Lipidogram' }),
    ]);
    const byId = Object.fromEntries(buildPanelFreshness(series, TODAY).map((p) => [p.id, p]));
    expect(byId.tarczyca.status).toBe('fresh');
    expect(byId.lipidy.status).toBe('stale');
    expect(byId.lipidy.ageDays).toBe(547);
    expect(byId.morfologia.status).toBe('missing');
    expect(byId.morfologia.lastDate).toBeNull();
  });
});

describe('buildPersonalInsights', () => {
  it('reports a marker that returned to range as good news', () => {
    const series = buildMarkerSeries([
      row({ marker_key: 'tsh', marker_name: 'TSH', result_date: '2025-04-25', value: 5.2, ref_low: 0.35, ref_high: 4.94 }),
      row({ marker_key: 'tsh', marker_name: 'TSH', result_date: '2026-08-19', value: 2.6, ref_low: 0.35, ref_high: 4.94 }),
    ]);
    const [insight] = buildPersonalInsights({ series, supplements: [], today: TODAY });
    expect(insight.tone).toBe('good');
    expect(insight.title).toContain('5,2 → 2,6');
  });

  it('ignores small changes and measurements too close in time', () => {
    const series = buildMarkerSeries([
      row({ marker_key: 'a', result_date: '2026-08-01', value: 100 }),
      row({ marker_key: 'a', result_date: '2026-08-19', value: 160 }),
      row({ marker_key: 'b', result_date: '2025-08-01', value: 100 }),
      row({ marker_key: 'b', result_date: '2026-08-19', value: 105 }),
    ]);
    expect(buildPersonalInsights({ series, supplements: [], today: TODAY })).toEqual([]);
  });

  it('flags a supplement whose marker is old or missing, but not a fresh one', () => {
    const series = buildMarkerSeries([
      row({ marker_key: 'vitamin_d_25oh', marker_name: 'Witamina D', result_date: '2025-04-25', value: 46, unit: 'ng/mL' }),
      row({ marker_key: 'ferritin', marker_name: 'Ferrytyna', result_date: '2026-08-19', value: 127 }),
    ]);
    const insights = buildPersonalInsights({
      series,
      today: TODAY,
      supplements: [
        { slug: 'd3', name: 'D3', active: true },
        { slug: 'magnez', name: 'Magnez', active: true },
        { slug: 'zelazo', name: 'Żelazo', active: true },
        { slug: 'omega', name: 'Omega', active: true },
      ],
    });
    const ids = insights.map((i) => i.id);
    expect(ids).toContain('supplement-vitamin_d_25oh');
    expect(ids).toContain('supplement-magnesium_serum');
    expect(ids).not.toContain('supplement-ferritin');
  });

  it('skips inactive supplements and keeps one line per marker, most urgent first', () => {
    const series = buildMarkerSeries([
      row({ marker_key: 'ldl', marker_name: 'LDL', result_date: '2024-01-01', value: 90, ref_high: 100 }),
      row({ marker_key: 'ldl', marker_name: 'LDL', result_date: '2026-08-19', value: 132, ref_high: 100, flag: 'high' }),
    ]);
    const insights = buildPersonalInsights({
      series, today: TODAY, supplements: [{ slug: 'd3', name: 'D3', active: false }],
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('range-ldl');
  });
});

describe('formatAge', () => {
  it('uses days, months and years', () => {
    expect(formatAge(12)).toBe('12 dni temu');
    expect(formatAge(547)).toBe('18 mies. temu');
    expect(formatAge(900)).toBe('2 lata temu');
  });
});
