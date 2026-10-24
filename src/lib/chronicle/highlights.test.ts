import { describe, expect, it } from 'vitest';
import { WEEK_HIGHLIGHTS, pickTiles } from './highlights';
import type { ChronicleSummaryData } from './summaryTypes';

const tile = (label: string) => ({ label, value: '1', delta: null, tone: 'neutral' as const });
const summary: ChronicleSummaryData = {
  goalLine: { title: 'Konto', hint: '', pct: null },
  tiles: [tile('Rozmowy odebrane'), tile('Umówieni'), tile('Sprzedaże')],
  chart: { label: '', unit: '', labels: [], values: [] },
  notes: [],
};

describe('pickTiles', () => {
  it('zwraca kafelki w kolejności etykiet i pomija nieistniejące', () => {
    expect(pickTiles(summary, ['Sprzedaże', 'Brak', 'Umówieni']).map((t) => t.label)).toEqual(['Sprzedaże', 'Umówieni']);
  });

  it('bez podsumowania nie rzuca wyjątku', () => {
    expect(pickTiles(null, ['Umówieni'])).toEqual([]);
  });

  it('skrót tygodnia obejmuje wszystkie trzy cele', () => {
    expect(WEEK_HIGHLIGHTS.map((h) => h.goal)).toEqual(['duch', 'konto', 'cialo']);
  });
});
