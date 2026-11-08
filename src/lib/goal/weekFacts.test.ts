import { describe, expect, it } from 'vitest';
import { buildWeekCoverage, buildWeekReport, type WeekFacts } from './weekFacts';

const facts = (overrides: Partial<WeekFacts> = {}): WeekFacts => ({
  week_start: '2026-11-02', days_elapsed: 7, own_entry_days: 5, own_words: 900, days_closed: 6, wins_z: 3, wins_p: 3,
  tasks_planned: 30, tasks_done: 20, workouts: 2, saunas: 1, sleep_nights: 7, sleep_avg_h: 6.7, readiness_avg: 78.7,
  spend_pln: 558.53, spend_tx: 23, review_done: true, review_answers: true, ...overrides,
});

describe('buildWeekCoverage', () => {
  it('pełny tydzień nie ma luk', () => {
    const rows = buildWeekCoverage(facts());
    expect(rows.every((row) => row.status !== 'gap')).toBe(true);
    expect(rows.find((row) => row.key === 'sleep')?.value).toBe('7/7 nocy · 6,7 h');
    expect(rows.find((row) => row.key === 'training')?.value).toBe('2 + 1 sauna');
  });

  it('brak wpisów, treningu i przeglądu to luki, a nie zera aktywności', () => {
    const rows = buildWeekCoverage(facts({ own_entry_days: 1, workouts: 0, review_done: false, days_closed: 3 }));
    expect(rows.filter((row) => row.status === 'gap').map((row) => row.key)).toEqual(['entries', 'closed', 'training', 'review']);
  });

  it('w trakcie tygodnia próg liczy się od dni, które minęły', () => {
    const rows = buildWeekCoverage(facts({ days_elapsed: 2, own_entry_days: 2, days_closed: 1, sleep_nights: 2 }));
    expect(rows.find((row) => row.key === 'entries')?.status).toBe('ok');
    expect(rows.find((row) => row.key === 'closed')?.status).toBe('ok');
  });

  it('brak planu zadań jest luką', () => {
    expect(buildWeekCoverage(facts({ tasks_planned: 0, tasks_done: 0 })).find((row) => row.key === 'tasks')).toMatchObject({ value: 'brak planu', status: 'gap' });
  });
});

describe('buildWeekReport', () => {
  it('podaje liczby z bazy i osobno luki', () => {
    const report = buildWeekReport(facts({ review_done: false, sleep_avg_h: null, readiness_avg: null }));
    expect(report.lines).toContain('Z/P: 3 Z, 3 P (domknięte dni: 6)');
    expect(report.lines).toContain('Sen: brak, gotowość brak');
    expect(report.lines).toContain('Wydatki: 559 zł (23 transakcji)');
    expect(report.gaps).toEqual(['Przegląd: czeka']);
  });
});
