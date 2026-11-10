import { describe, expect, it } from 'vitest';
import { buildMonthPlan, closeRate, EMPTY_DAY, isReflected, summarizeProgress, type DayActual, type PlanDay } from './monthPlan';

const config = { startDate: '2026-11-02', targetPln: 10000, showRate: 2 / 3, minSalesWeekDays: 3 };
const plan = buildMonthPlan(config);
const day = (patch: Partial<DayActual>): DayActual => ({ ...EMPTY_DAY, ...patch });
const flatDays = (p: ReturnType<typeof buildMonthPlan>) => p.weeks.flatMap((week) => week.cells).filter((cell): cell is PlanDay => cell !== null);
const days = flatDays(plan);
const REFLECTION = 'Zamknąłem dzień z konkretną refleksją.';

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

describe('przeliczenie od 9.11 po 9 umówionych', () => {
  const rebased = buildMonthPlan({ ...config, rebase: { from: '2026-11-09', done: 9 } });
  const fromNow = flatDays(rebased).filter((d) => d.kind === 'plan' && d.date >= '2026-11-09');

  it('102 brakujące spotkania rozkłada na 16 dni roboczych po 6 albo 7', () => {
    expect(fromNow).toHaveLength(16);
    expect(fromNow.reduce((sum, d) => sum + d.target, 0)).toBe(102);
    expect(fromNow.every((d) => d.target === 6 || d.target === 7)).toBe(true);
    expect(rebased.totals.booked).toBe(111);
  });

  it('bez wpisów pierwotny plan i bieżące minimum są takie same', () => {
    expect(fromNow.every((d) => d.target === d.planned)).toBe(true);
  });
});

describe('plan przeliczany na bieżąco', () => {
  const rebase = { ...config, rebase: { from: '2026-11-09', done: 9 } };
  const planFrom = (actuals: Record<string, DayActual>, today: string) => buildMonthPlan(rebase, actuals, today);
  const targetsFrom = (p: ReturnType<typeof buildMonthPlan>, date: string) => flatDays(p).filter((d) => d.kind === 'plan' && d.date >= date);
  const sumTargets = (p: ReturnType<typeof buildMonthPlan>, date: string) => targetsFrom(p, date).reduce((total, d) => total + d.target, 0);

  const firstWeekSale = { '2026-11-03': day({ salesCalls: 2, salesClosed: 1 }) };

  it('brak z dni, które minęły, rozkłada się na pozostałe dni roboczych', () => {
    const actuals = { ...firstWeekSale };
    const live = planFrom(actuals, '2026-11-12');
    expect(targetsFrom(live, '2026-11-12')).toHaveLength(13);
    expect(sumTargets(live, '2026-11-12')).toBe(102);
    expect(targetsFrom(live, '2026-11-12')[0]).toMatchObject({ date: '2026-11-12', target: 8, planned: 7 });
    expect(summarizeProgress(live, actuals, '2026-11-12')).toMatchObject({ todayTarget: 8, todayPlanned: 7, todayDone: 0, todayLeft: 8 });
  });

  it('dzień zamknięty z mniejszą liczbą podnosi kolejne dni, otwarty dzień ich nie rusza', () => {
    const met = { ...firstWeekSale, '2026-11-09': day({ appointments: 7 }) };
    const open = planFrom({ ...met, '2026-11-10': day({ appointments: 1 }) }, '2026-11-10');
    expect(targetsFrom(open, '2026-11-11').every((d) => d.target === d.planned)).toBe(true);

    const closed = planFrom({ ...met, '2026-11-10': day({ appointments: 1, reflection: REFLECTION }) }, '2026-11-10');
    expect(sumTargets(closed, '2026-11-11')).toBe(111 - (9 + 7 + 1));
    expect(sumTargets(closed, '2026-11-11')).toBeGreaterThan(sumTargets(open, '2026-11-11'));
  });

  it('nadwyżka skraca kolejne dni i nie daje ujemnego minimum', () => {
    const ahead = planFrom({ '2026-11-09': day({ appointments: 200 }) }, '2026-11-10');
    expect(targetsFrom(ahead, '2026-11-10').every((d) => d.target === 0)).toBe(true);
    expect(summarizeProgress(ahead, {}, '2026-11-10')).toMatchObject({ todayTarget: 0, todayLeft: 0, todayIsPlanDay: true });
  });

  it('weekend zmniejsza kolejne dni, ale sam nie ma minimum', () => {
    const saturday = planFrom({ '2026-11-14': day({ appointments: 10 }) }, '2026-11-16');
    const none = planFrom({}, '2026-11-16');
    expect(sumTargets(saturday, '2026-11-16')).toBe(sumTargets(none, '2026-11-16') - 10);
    expect(flatDays(saturday).find((d) => d.date === '2026-11-14')).toMatchObject({ kind: 'reserve', target: 0 });
  });

  it('tydzień bez sprzedaży podnosi liczbę spotkań, bo cel w złotych zostaje', () => {
    const missed = planFrom({}, '2026-11-09');
    expect(missed.totals.held).toBe(80);
    expect(missed.totals.booked).toBe(9 + 111);
    expect(missed.totals.payout).toBeGreaterThanOrEqual(10000);
    expect(sumTargets(missed, '2026-11-09')).toBeGreaterThan(sumTargets(planFrom({}, ''), '2026-11-09'));
  });

  it('sprzedaż w tygodniu zdejmuje to wymaganie', () => {
    const sold = planFrom({ '2026-11-03': day({ salesClosed: 1, salesCalls: 3 }) }, '2026-11-09');
    expect(sold.totals).toMatchObject({ held: 74, booked: 111 });
  });
});

describe('summarizeProgress', () => {
  it('zlicza umówione i sprzedaże z weekendu', () => {
    const weekend = summarizeProgress(
      plan,
      { '2026-11-02': day({ appointments: 3, salesCalls: 0, salesClosed: 0 }), '2026-11-07': day({ appointments: 3, salesCalls: 2, salesClosed: 1 }) },
      '2026-11-09',
    );
    expect(weekend.salesDone).toBe(1);
    expect(weekend.bookedDone).toBe(6);
  });

  it('dziś pokazuje minimum, zrobione i resztę, a w weekend nie ma celu', () => {
    const working = summarizeProgress(plan, { '2026-11-03': day({ appointments: 2 }) }, '2026-11-03');
    expect(working).toMatchObject({ todayIsPlanDay: true, todayTarget: 6, todayDone: 2, todayLeft: 4 });
    const weekend = summarizeProgress(plan, {}, '2026-11-07');
    expect(weekend).toMatchObject({ todayIsPlanDay: false, todayTarget: 0, todayLeft: 0 });
  });
});

describe('closeRate', () => {
  it('to sprzedaże podzielone przez sales calle, a bez rozmów brak wartości', () => {
    expect(closeRate(2, 8)).toBe(0.25);
    expect(closeRate(0, 0)).toBeNull();
  });

  it('postęp liczy średni close rate z całego miesiąca', () => {
    const progress = summarizeProgress(plan, {
      '2026-11-02': day({ appointments: 5, salesCalls: 3, salesClosed: 1 }),
      '2026-11-03': day({ appointments: 5, salesCalls: 5, salesClosed: 1 }),
    }, '2026-11-04');
    expect(progress).toMatchObject({ salesCallsDone: 8, salesDone: 2, closeRate: 0.25 });
  });
});

describe('czas i refleksja', () => {
  it('sumuje dials, czas pracy, refleksji i nauki oraz liczy dni z refleksją', () => {
    const progress = summarizeProgress(plan, {
      '2026-11-02': day({ dials: 20, workMinutes: 120, reflectionMinutes: 15, learningMinutes: 30, reflection: 'Za wcześnie podałem cenę, jutro zapytam o gotowość.' }),
      '2026-11-03': day({ dials: 10, workMinutes: 60, learningMinutes: 20, reflection: 'krótko' }),
    }, '2026-11-04');
    expect(progress).toMatchObject({
      dialsDone: 30, workMinutesDone: 180, reflectionMinutesDone: 15, learningMinutesDone: 50, reflectedDays: 1, elapsedPlanDays: 3,
    });
  });

  it('refleksja krótsza niż minimum nie zamyka dnia', () => {
    expect(isReflected(day({ reflection: '   za krótko  ' }))).toBe(false);
    expect(isReflected(day({ reflection: 'Dwanaście zdań to nie musi być, wystarczy sens.' }))).toBe(true);
    expect(isReflected(undefined)).toBe(false);
  });
});
