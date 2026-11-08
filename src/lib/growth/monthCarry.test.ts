import { describe, expect, it } from 'vitest';
import { monthCarryToWeekPlan } from './monthCarry';
import { collectWeeklyAnswers, type MonthFacts } from './monthReview';

const facts: MonthFacts = {
  monthStart: '2026-05-01',
  monthEnd: '2026-05-31',
  monthLabel: 'maj 2026',
  weeksInMonth: 5,
  weeksReviewed: 4,
  weeklyAnswers: [],
  powerListDone: 40,
  powerListPlanned: 50,
  powerListZ: 12,
  powerListP: 3,
  kpiWeeksLogged: 4,
  pillarAverages: { cialo: 5, duch: 8, konto: 6 },
  activeProjectCount: 2,
};

describe('monthCarryToWeekPlan', () => {
  it('carries theme, correction and pillar hints', () => {
    const plan = monthCarryToWeekPlan(
      {
        month_theme: 'Pipeline przed perfekcją',
        correction_note: 'Więcej snu',
        leverage_note: 'Deep work rano',
      },
      facts,
    );
    expect(plan.intention).toBe('Pipeline przed perfekcją');
    expect(plan.commitment).toBe('Więcej snu');
    expect(plan.cialo).toBe('Więcej snu');
    expect(plan.duch).toBe('Deep work rano');
  });
});

describe('collectWeeklyAnswers', () => {
  it('bierze tylko tygodnie z odpowiedzią użytkownika, po kolei, bez pustych spacji', () => {
    expect(collectWeeklyAnswers([
      { week_start: '2026-10-12', proud_of: '  Maraton ', sabotage: null, do_differently: '' },
      { week_start: '2026-10-05', proud_of: null, sabotage: null, do_differently: null },
      { week_start: '2026-10-19', proud_of: null, sabotage: 'Sen', do_differently: 'Spać o 22:30' },
    ])).toEqual([
      { weekStart: '2026-10-12', wentWell: 'Maraton', didNotWork: '', oneChange: '' },
      { weekStart: '2026-10-19', wentWell: '', didNotWork: 'Sen', oneChange: 'Spać o 22:30' },
    ]);
  });
});
