import { describe, expect, it } from 'vitest';
import { buildSalesIncomePlan, type SalesIncomeInput } from './salesIncomePlan';

const base: SalesIncomeInput = {
  targetNet: 10000,
  deductionsPct: 0,
  role: 'both',
  offerGross: 5500,
  vatPct: 23,
  commissionPct: 15,
  perMeeting: 100,
  perSaleBonus: 50,
  conversion: 0.25,
  daysPerWeek: 4,
  weeksPerMonth: 4,
};

describe('buildSalesIncomePlan', () => {
  it('liczy prowizję od netto: 15% z 5500 brutto + 50 zł = 720,73 zł', () => {
    expect(buildSalesIncomePlan(base)!.perSaleCommission).toBeCloseTo(720.73, 2);
  });

  it('setter + closer: 10 tys. przy 25% skuteczności to 36 spotkań i 9 sprzedaży', () => {
    const plan = buildSalesIncomePlan(base)!;
    expect(plan.meetingsPerMonth).toBe(36);
    expect(plan.salesPerMonth).toBe(9);
    expect(plan.expectedPayout).toBeGreaterThanOrEqual(10000);
    expect(plan.meetingsPerDay).toBe(3);
  });

  it('więcej dni w tygodniu zmniejsza dzienną liczbę spotkań', () => {
    expect(buildSalesIncomePlan({ ...base, daysPerWeek: 6 })!.meetingsPerDay).toBe(2);
  });

  it('closer potrzebuje samych sprzedaży: 10 tys. to 14 sprzedaży', () => {
    const plan = buildSalesIncomePlan({ ...base, role: 'closer' })!;
    expect(plan.salesPerMonth).toBe(14);
    expect(plan.expectedPayout).toBeGreaterThanOrEqual(10000);
  });

  it('setter dostaje 100 zł za spotkanie i 50 zł za sprzedaż', () => {
    const plan = buildSalesIncomePlan({ ...base, role: 'setter' })!;
    expect(plan.perMeetingValue).toBeCloseTo(112.5, 2);
    expect(plan.meetingsPerMonth).toBe(89);
  });

  it('podatki i składki podnoszą wymaganą wypłatę brutto', () => {
    const plan = buildSalesIncomePlan({ ...base, deductionsPct: 20 })!;
    expect(plan.payoutNeeded).toBeCloseTo(12500, 2);
  });

  it('zwraca null dla nieprawidłowych danych', () => {
    expect(buildSalesIncomePlan({ ...base, conversion: 0 })).toBeNull();
    expect(buildSalesIncomePlan({ ...base, targetNet: 0 })).toBeNull();
  });
});
