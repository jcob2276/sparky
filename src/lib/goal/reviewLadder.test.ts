import { describe, expect, it } from 'vitest';
import { buildLadder } from './reviewLadder.data';

const sprint = { label: 'Sprint 4', summary: null, goals: { cialo: 'Sen przed 23:00' } };

describe('buildLadder', () => {
  const weekRows = [
    {
      week_start: '2026-11-02', pillar_scores: { cialo: 4, duch: 6, konto: 7 }, week_goal_cialo: 'Trzy treningi',
      week_goal_duch: null, week_goal_konto: null, week_highlight: ' Ciężki tydzień ', goal_status: { cialo: 'missed', zly: 'done' },
      review_completed_at: '2026-11-08T19:00:00Z',
    },
  ];
  const monthRows = [
    {
      month_start: '2026-10-26', pillar_scores: { cialo: 5 }, goal_cialo: 'Rytm snu', goal_duch: null, goal_konto: null,
      month_theme: 'Wejście', correction_note: null, goal_status: null, completed_at: null,
    },
  ];

  it('układa 12 tygodni i 3 miesiące, a zapisane dane wiąże po dacie początku', () => {
    const ladder = buildLadder('2026-10-26', '2026-11-16', sprint, weekRows, monthRows);
    expect(ladder.weeks).toHaveLength(12);
    expect(ladder.months).toHaveLength(3);
    expect(ladder.weeks[1]).toMatchObject({
      number: 2, closed: true, note: 'Ciężki tydzień', goals: { cialo: 'Trzy treningi' }, scores: { cialo: 4, duch: 6, konto: 7 },
    });
    expect(ladder.months[0]).toMatchObject({ theme: 'Wejście', goals: { cialo: 'Rytm snu' }, closed: false });
  });

  it('odrzuca nieznane filary i wartości w rozliczeniu celu', () => {
    const ladder = buildLadder('2026-10-26', '2026-11-16', sprint, weekRows, monthRows);
    expect(ladder.weeks[1].goalStatus).toEqual({ cialo: 'missed' });
  });

  it('zaznacza przeglądany tydzień i bieżący miesiąc, a późniejsze tygodnie jako przyszłe', () => {
    const ladder = buildLadder('2026-10-26', '2026-11-16', sprint, weekRows, monthRows);
    expect(ladder.weeks.find((w) => w.current)?.number).toBe(4);
    expect(ladder.weeks[4].future).toBe(true);
    expect(ladder.weeks[3].future).toBe(false);
    expect(ladder.months.find((m) => m.current)?.number).toBe(1);
  });
});
