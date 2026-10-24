import { describe, expect, it } from 'vitest';
import { buildWeekInsights } from './weekInsights';
import type { WinsDayCell, WinsTask } from './weeklyWinsMap';

const TODAY = '2026-10-24';

function day(date: string, label: string, score: number | null, tasks: Array<[string, boolean]>, note: string | null = null): WinsDayCell {
  const list: WinsTask[] = tasks.map(([category, done], i) => ({ slot: i + 1, title: `t${i}`, done, category }));
  return {
    date, label, result: null, score, note, tasks: list,
    doneCount: list.filter((t) => t.done).length, plannedCount: list.length, status: 'loss',
  };
}

describe('buildWeekInsights', () => {
  it('summarises ratings and quotes the worst day in the user\'s own words', () => {
    const { insights, averageScore, scoredDays } = buildWeekInsights([
      day('2026-10-19', 'pn', 6, []),
      day('2026-10-22', 'cz', 4, [], 'muszę coś zmienić'),
      day('2026-10-23', 'pt', 5, []),
    ], TODAY);
    expect(scoredDays).toBe(3);
    expect(averageScore).toBe(5);
    expect(insights.find((i) => i.id === 'scores')?.detail).toContain('czwartek (4)');
    expect(insights.find((i) => i.id === 'worst-note')?.detail).toContain('muszę coś zmienić');
  });

  it('names the category skipped most, only with enough samples', () => {
    const days = [
      day('2026-10-19', 'pn', 6, [['duch', false], ['konto', true]]),
      day('2026-10-20', 'wt', 5, [['duch', false], ['konto', true]]),
      day('2026-10-21', 'śr', 6, [['duch', true], ['konto', true]]),
    ];
    const weakest = buildWeekInsights(days, TODAY).insights.find((i) => i.id === 'weakest-category');
    expect(weakest?.title).toContain('Duch');
    expect(weakest?.detail).toBe('1 z 3 zadań zrobionych w tym obszarze.');

    const tooFew = buildWeekInsights(days.slice(0, 2), TODAY).insights.find((i) => i.id === 'weakest-category');
    expect(tooFew).toBeUndefined();
  });

  it('compares ratings on days with and without a category done, needing two days per side', () => {
    const days = [
      day('2026-10-19', 'pn', 6, [['cialo', true]]),
      day('2026-10-20', 'wt', 6, [['cialo', true]]),
      day('2026-10-21', 'śr', 3, [['cialo', false]]),
      day('2026-10-22', 'cz', 4, [['cialo', false]]),
    ];
    const gap = buildWeekInsights(days, TODAY).insights.find((i) => i.id === 'category-score-gap');
    expect(gap?.title).toContain('Ciało');
    expect(gap?.title).toContain('wyżej');
    expect(gap?.detail).toContain('6 (2 dni) wobec 3,5 (2 dni bez)');

    const oneSide = buildWeekInsights(days.slice(0, 3), TODAY).insights.find((i) => i.id === 'category-score-gap');
    expect(oneSide).toBeUndefined();
  });

  it('ignores today until it has a rating, and says nothing without data', () => {
    const { insights } = buildWeekInsights([day(TODAY, 'sb', null, [['duch', false], ['duch', false], ['duch', false]])], TODAY);
    expect(insights).toEqual([]);
  });
});
