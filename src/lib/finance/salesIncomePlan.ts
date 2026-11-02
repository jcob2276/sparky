export type SalesRole = 'setter' | 'closer' | 'both';

export interface SalesIncomeInput {
  /** Kwota, którą chcesz mieć na koncie (po podatkach i składkach). */
  targetNet: number;
  /** Podatki i składki jako % wypłaty brutto (0 = kwoty z umowy są już „na rękę”). */
  deductionsPct: number;
  role: SalesRole;
  /** Cena oferty brutto z VAT. */
  offerGross: number;
  vatPct: number;
  commissionPct: number;
  perMeeting: number;
  perSaleBonus: number;
  /** Skuteczność: sprzedaże na odbyte spotkanie, 0–1. */
  conversion: number;
  daysPerWeek: number;
  weeksPerMonth: number;
}

export interface SalesIncomePlan {
  payoutNeeded: number;
  perSaleCommission: number;
  perMeetingValue: number;
  meetingsPerMonth: number;
  salesPerMonth: number;
  workDays: number;
  meetingsPerDay: number;
  salesPerDay: number;
  /** Faktyczna wypłata po zaokrągleniu do pełnych spotkań i sprzedaży. */
  expectedPayout: number;
}

export function buildSalesIncomePlan(input: SalesIncomeInput): SalesIncomePlan | null {
  const { targetNet, deductionsPct, role, offerGross, vatPct, commissionPct, perMeeting, perSaleBonus, conversion, daysPerWeek, weeksPerMonth } = input;
  if (targetNet <= 0 || conversion <= 0 || conversion > 1 || daysPerWeek <= 0 || weeksPerMonth <= 0 || deductionsPct >= 100) return null;

  const payoutNeeded = targetNet / (1 - deductionsPct / 100);
  const commission = (offerGross / (1 + vatPct / 100)) * (commissionPct / 100);
  const perSaleCommission = commission + perSaleBonus;
  // Setter dostaje za spotkanie i bonus za sprzedaż, closer tylko prowizję i bonus.
  const perMeetingValue = role === 'closer'
    ? conversion * perSaleCommission
    : perMeeting + conversion * (role === 'both' ? perSaleCommission : perSaleBonus);

  const meetingsPerMonth = Math.ceil(payoutNeeded / perMeetingValue - 1e-9);
  const salesPerMonth = Math.ceil(meetingsPerMonth * conversion - 1e-9);
  const workDays = daysPerWeek * weeksPerMonth;
  const expectedPayout = role === 'closer'
    ? salesPerMonth * perSaleCommission
    : meetingsPerMonth * perMeeting + salesPerMonth * (role === 'both' ? perSaleCommission : perSaleBonus);

  return {
    payoutNeeded,
    perSaleCommission,
    perMeetingValue,
    meetingsPerMonth,
    salesPerMonth,
    workDays,
    meetingsPerDay: Math.ceil(meetingsPerMonth / workDays - 1e-9),
    salesPerDay: salesPerMonth / workDays,
    expectedPayout,
  };
}
