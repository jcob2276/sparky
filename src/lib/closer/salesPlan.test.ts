import { describe, expect, it } from 'vitest';
import { buildSalesPlan, workdaysLeft } from './salesPlan';

const targets = { appointments: 30, salesCalls: 10 };

describe('workdaysLeft', () => {
  it('liczy dni robocze od dziś do piątku włącznie, w weekend 0', () => {
    expect(workdaysLeft('2026-10-19')).toBe(5); // poniedziałek
    expect(workdaysLeft('2026-10-21')).toBe(3); // środa
    expect(workdaysLeft('2026-10-23')).toBe(1); // piątek
    expect(workdaysLeft('2026-10-24')).toBe(0); // sobota
    expect(workdaysLeft('2026-10-25')).toBe(0); // niedziela
  });
});

describe('buildSalesPlan', () => {
  it('liczy brakujące rozmowy odebrane przy Twoim współczynniku i rozkłada je na dni robocze', () => {
    const plan = buildSalesPlan({ dials: 40, appointments: 10, salesCalls: 6, salesClosed: 1 }, targets, '2026-10-21');
    expect(plan.apptRate).toBe(0.25);
    expect(plan.missingAppointments).toBe(20);
    expect(plan.dialsNeeded).toBe(80);
    expect(plan.dialsPerDay).toBe(27);
    expect(plan.dialsForFullWeek).toBe(120);
    expect(plan.saleRate).toBeCloseTo(1 / 6, 5);
    expect(plan.missingSalesCalls).toBe(4);
    expect(plan.expectedSalesFromMissingCalls).toBe(0.7);
  });

  it('za mała próba nie daje współczynnika ani liczb dziennych', () => {
    const plan = buildSalesPlan({ dials: 10, appointments: 3, salesCalls: 2, salesClosed: 1 }, targets, '2026-10-20');
    expect(plan.apptRate).toBeNull();
    expect(plan.dialsNeeded).toBeNull();
    expect(plan.dialsPerDay).toBeNull();
    expect(plan.saleRate).toBeNull();
  });

  it('cel już osiągnięty nie wymaga rozmów, a w weekend nie dzieli na dni', () => {
    const done = buildSalesPlan({ dials: 100, appointments: 32, salesCalls: 11, salesClosed: 2 }, targets, '2026-10-21');
    expect(done.missingAppointments).toBe(0);
    expect(done.dialsNeeded).toBe(0);
    const weekend = buildSalesPlan({ dials: 75, appointments: 16, salesCalls: 9, salesClosed: 1 }, targets, '2026-10-24');
    expect(weekend.workdaysLeft).toBe(0);
    expect(weekend.dialsPerDay).toBeNull();
    expect(weekend.dialsForFullWeek).toBe(141);
  });
});

import { closerKpiValue } from './closerDayModel';

describe('closerKpiValue', () => {
  const sums = { appointments: 16, salesCalls: 9, dials: 75, workHours: 12.34 };
  it('dopasowuje KPI po nazwie, także po zmianie „Liczba diali” na „Rozmowy odebrane”', () => {
    expect(closerKpiValue('Umówienia', sums)).toBe(16);
    expect(closerKpiValue('Sales calle', sums)).toBe(9);
    expect(closerKpiValue('Rozmowy odebrane', sums)).toBe(75);
    expect(closerKpiValue('Liczba diali', sums)).toBe(75);
    expect(closerKpiValue('Godziny pracy', sums)).toBe(12.3);
    expect(closerKpiValue('Coś innego', sums)).toBe(0);
  });
});

import { closerTargetsFromKpis, DEFAULT_CLOSER_TARGETS } from './closerDayModel';

describe('closerTargetsFromKpis', () => {
  it('bierze cele z KPI po nazwie, a braki i zera zastępuje wartościami awaryjnymi', () => {
    expect(closerTargetsFromKpis([{ name: 'Umówienia', target: '40' }, { name: 'Sales calle', target: 12 }, { name: 'Rozmowy odebrane', target: 75 }])).toEqual({ appointments: 40, salesCalls: 12 });
    expect(closerTargetsFromKpis([{ name: 'Umówienia', target: null }, { name: 'Sales calle', target: 0 }])).toEqual(DEFAULT_CLOSER_TARGETS);
  });
});
