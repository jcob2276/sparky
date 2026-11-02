import { describe, expect, it } from 'vitest';
import { buildMonthPlan, closeRate, summarizeProgress, type PlanDay } from './monthPlan';

const config = { startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 };
const plan = buildMonthPlan(config);
const days = plan.weeks.flatMap((week) => week.cells).filter((cell): cell is PlanDay => cell !== null);

describe('buildMonthPlan', () => {
  it('listopad od 2.11: 4 sprzedaże, 74 odbyte i 111 umówionych spotkań', () => {
    expect(plan.totals).toMatchObject({ sales: 4, held: 74, booked: 111, planDays: 21 });
    expect(plan.totals.payout).toBeGreaterThanOrEqual(10000);
  });

  it('rozkłada 111 spotkań na 21 dni roboczych po 5 albo 6, z zapasem na początku', () => {
    const plan21 = days.filter((day) => day.kind === 'plan');
    expect(plan21).toHaveLength(21);
    expect(plan21.reduce((sum, day) => sum + day.target, 0)).toBe(111);
    expect(plan21.every((day) => day.target === 5 || day.target === 6)).toBe(true);
    expect(plan21[0].target).toBe(6);
  });

  it('daje pięć tygodni, ostatni to sam 30.11 bez wymaganej sprzedaży', () => {
    expect(plan.weeks).toHaveLength(5);
    expect(plan.weeks.map((week) => week.salesMin)).toEqual([1, 1, 1, 1, 0]);
    expect(plan.weeks[4].cells.filter(Boolean)).toHaveLength(1);
  });

  it('sobota i niedziela to rezerwa bez minimum, 11.11 jest zwykłym dniem', () => {
    const byDate = Object.fromEntries(days.map((day) => [day.date, day]));
    expect(byDate['2026-11-07']).toMatchObject({ kind: 'reserve', target: 0 });
    expect(byDate['2026-11-11'].kind).toBe('plan');
    expect(byDate['2026-11-01']).toBeUndefined();
  });
});

describe('summarizeProgress', () => {
  it('liczy zaległość z dni sprzed dzisiaj, a weekend ją zmniejsza', () => {
    const behind = summarizeProgress(plan, { '2026-11-02': { appointments: 3, salesCalls: 0, salesClosed: 0 } }, '2026-11-03');
    expect(behind.backlog).toBe(3);
    expect(behind.todayNeeded).toBe(behind.todayTarget + 3);
    const weekend = summarizeProgress(
      plan,
      { '2026-11-02': { appointments: 3, salesCalls: 0, salesClosed: 0 }, '2026-11-07': { appointments: 3, salesCalls: 2, salesClosed: 1 } },
      '2026-11-09',
    );
    expect(weekend.salesDone).toBe(1);
    expect(weekend.bookedDone).toBe(6);
  });

  it('nadwyżka nie ujemnia zaległości', () => {
    const ahead = summarizeProgress(plan, { '2026-11-02': { appointments: 30, salesCalls: 0, salesClosed: 0 } }, '2026-11-03');
    expect(ahead.backlog).toBe(0);
    expect(ahead.todayBlocks).toBe(Math.ceil(ahead.todayTarget / 5));
  });
});

describe('closeRate', () => {
  it('to sprzedaże podzielone przez sales calle, a bez rozmów brak wartości', () => {
    expect(closeRate(2, 8)).toBe(0.25);
    expect(closeRate(0, 0)).toBeNull();
  });

  it('postęp liczy średni close rate z całego miesiąca', () => {
    const progress = summarizeProgress(plan, {
      '2026-11-02': { appointments: 5, salesCalls: 3, salesClosed: 1 },
      '2026-11-03': { appointments: 5, salesCalls: 5, salesClosed: 1 },
    }, '2026-11-04');
    expect(progress).toMatchObject({ salesCallsDone: 8, salesDone: 2, closeRate: 0.25 });
  });
});
