import { describe, expect, it } from 'vitest';
import type { ReviewDay } from './reviewCycle.types';
import { bedtimeOf, buildReviewDays } from './reviewWeekDays';
import { bestAndWorstDay, dayCorrelations, goalAlignment, recurringMissed, tasksByPillar, tasksOnDay, weekKpis } from './reviewWeekInsights';

const day = (date: string, over: Partial<ReviewDay>): ReviewDay => ({
  date, score: null, sleepHours: null, bedtime: null, bedtimeMinutes: null,
  tasksDone: 0, tasksTotal: 0, phoneMinutes: null, hasNote: false, ...over,
});

describe('bedtimeOf', () => {
  it('liczy godzinę po północy jako późniejszą niż 23:30', () => {
    const late = bedtimeOf('2026-11-17T00:15:00+01:00');
    const early = bedtimeOf('2026-11-16T22:40:00+01:00');
    expect(late?.label).toBe('00:15');
    expect(late!.minutes).toBeGreaterThan(early!.minutes);
  });
});

describe('buildReviewDays', () => {
  it('daje zawsze 7 dni i łączy ocenę, sen i zadania po dacie', () => {
    const days = buildReviewDays('2026-11-16', {
      wins: [{ date: '2026-11-17', day_note: 'ok', daily_win_tasks: [{ title: 'Trening', done: true }, { title: 'Calls', done: false }, { title: ' ', done: true }] }],
      scores: [{ date: '2026-11-17', day_score: 8 }],
      sleep: [{ date: '2026-11-17', total_sleep_hours: 6.14, bedtime_timestamp: null }],
      phone: [],
    });
    expect(days).toHaveLength(7);
    expect(days[1]).toMatchObject({ score: 8, sleepHours: 6.1, tasksDone: 1, tasksTotal: 2, hasNote: true });
    expect(days[0].score).toBeNull();
  });
});

describe('bestAndWorstDay', () => {
  it('wybiera najwyższą i najniższą ocenę, a przy jednej ocenie nie wskazuje najsłabszego', () => {
    const { best, worst } = bestAndWorstDay([day('a', { score: 4 }), day('b', { score: 8 }), day('c', { score: 6 })]);
    expect(best?.date).toBe('b');
    expect(worst?.date).toBe('a');
    expect(bestAndWorstDay([day('a', { score: 5 })]).worst).toBeNull();
  });
});

describe('dayCorrelations', () => {
  it('pokazuje tylko wyraźne różnice z co najmniej 2 dniami po obu stronach', () => {
    const days = [
      day('1', { score: 8, sleepHours: 7.5, phoneMinutes: 200 }),
      day('2', { score: 7, sleepHours: 7.2, phoneMinutes: 100 }),
      day('3', { score: 4, sleepHours: 5.5, phoneMinutes: 210 }),
      day('4', { score: 5, sleepHours: 6, phoneMinutes: 90 }),
    ];
    const result = dayCorrelations(days);
    expect(result.map((c) => c.label)).toEqual(['Sen ≥ 7 h']);
    expect(result[0]).toMatchObject({ withAvg: 7.5, withoutAvg: 4.5 });
  });
});

describe('zadania', () => {
  const tasks = {
    done: [{ id: '1', title: 'Trening', done: true, category: 'cialo' }],
    missed: [
      { id: '2', title: 'Sales calls', done: false, category: 'konto' },
      { id: '3', title: 'Sales calls ', done: false, category: 'konto' },
      { id: '4', title: 'Trening', done: false, category: 'cialo' },
      { id: '5', title: 'Pranie', done: false, category: null },
    ],
  };

  it('grupuje zadania po filarze i łączy powtórki z kilku dni', () => {
    const grouped = tasksByPillar(tasks);
    expect(grouped.cialo).toEqual([{ title: 'Trening', done: 1, missed: 1 }]);
    expect(grouped.konto).toEqual([{ title: 'Sales calls', done: 0, missed: 2 }]);
    expect(grouped.inne).toEqual([{ title: 'Pranie', done: 0, missed: 1 }]);
  });

  it('wskazuje zadania odkładane bez ani jednego domknięcia', () => {
    expect(recurringMissed(tasks)).toEqual([
      { title: 'Sales calls', count: 2 },
      { title: 'Pranie', count: 1 },
    ]);
  });
});

describe('weekKpis', () => {
  it('liczy zadania, średnią oceny i sen, a brakujące dane pomija', () => {
    const kpis = weekKpis({
      tasks: { done: [{ id: '1', title: 'a', done: true }], missed: [{ id: '2', title: 'b', done: false }] },
      days: [day('a', { score: 4, sleepHours: 6 }), day('b', { score: 7, sleepHours: 7 }), day('c', {})],
    });
    expect(kpis.map((k) => [k.key, k.value])).toEqual([['tasks', '1/2'], ['score', '5,5'], ['sleep', '6,5 h']]);
    expect(weekKpis({})).toEqual([]);
  });
});

describe('plan dzień po dniu', () => {
  const tasks = {
    done: [
      { id: '1', title: 'Trening', done: true, category: 'cialo', date: '2026-11-17' },
      { id: '2', title: 'Dymora', done: true, category: null, date: '2026-11-17' },
    ],
    missed: [
      { id: '3', title: 'Calls', done: false, category: 'konto', date: '2026-11-17' },
      { id: '4', title: 'Pranie', done: false, category: 'inne', date: '2026-11-18' },
    ],
  };

  it('daje zadania jednego dnia, zrobione najpierw', () => {
    expect(tasksOnDay(tasks, '2026-11-17').map((t) => t.title)).toEqual(['Trening', 'Dymora', 'Calls']);
    expect(tasksOnDay(tasks, '2026-11-19')).toEqual([]);
  });

  it('liczy, ile zadań pracowało na filary i ile z nich zrobiono, a ile poza nimi', () => {
    expect(goalAlignment(tasks)).toEqual({
      total: 4, onGoal: 2, onGoalDone: 1, off: 2, offDone: 1,
      byPillar: [{ key: 'cialo', count: 1 }, { key: 'duch', count: 0 }, { key: 'konto', count: 1 }],
    });
  });
});
