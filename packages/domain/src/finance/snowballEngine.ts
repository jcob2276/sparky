/**
 * Snowball Analytics Engine for Sparky OS.
 * Dividend totals for manually entered payouts.
 */

export interface DividendRecord {
  id: string;
  ticker: string;
  companyName: string;
  amountPerShare: number;
  sharesCount: number;
  totalAmount: number;
  currency: string;
  exDate: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  status: 'expected' | 'received';
  payoutRatioPct?: number;
  fcfCoverageRatio?: number;
  isIkeAccount?: boolean; // 0% Belka Tax Shield
}

export interface TaxSettings {
  applyBelkaTax: boolean; // 19% Polish Belka Tax
  w8BenRatePct: number; // 15% US withholding tax for W8-BEN
}

/**
 * Calculates net dividend after tax deductions (Belka 19% or W8-BEN 15%).
 * If account is IKE (isIkeAccount = true), Polish Belka Tax is 0%!
 */
export function calculateNetDividend(grossAmount: number, isUsStock: boolean, settings: TaxSettings, isIkeAccount = false): number {
  if (isIkeAccount) return grossAmount; // IKE Tax Shield = 0% Belka Tax
  if (!settings.applyBelkaTax) return grossAmount;
  const taxRate = isUsStock ? Math.max(0.19, settings.w8BenRatePct / 100) : 0.19;
  return Math.round(grossAmount * (1 - taxRate) * 100) / 100;
}

/**
 * Totals the supplied payouts by payment month (Gross vs Net).
 * The legacy name does not imply a date filter; the monthly average divides their sum by 12.
 */
export function calculate12MonthDividendForecast(
  dividends: DividendRecord[],
  taxSettings: TaxSettings = { applyBelkaTax: true, w8BenRatePct: 15 },
): {
  monthlyTotalsGross: Record<string, number>;
  monthlyTotalsNet: Record<string, number>;
  total12MonthForecastGross: number;
  total12MonthForecastNet: number;
  averageMonthlyIncomeNet: number;
} {
  const monthlyTotalsGross: Record<string, number> = {};
  const monthlyTotalsNet: Record<string, number> = {};
  let total12MonthForecastGross = 0;
  let total12MonthForecastNet = 0;

  dividends.forEach((div) => {
    const monthKey = div.payDate.slice(0, 7);
    const isUs = div.ticker.includes('AAPL') || div.ticker.includes('MSFT') || div.ticker.includes('NVDA');
    const netAmount = calculateNetDividend(div.totalAmount, isUs, taxSettings, Boolean(div.isIkeAccount));

    monthlyTotalsGross[monthKey] = (monthlyTotalsGross[monthKey] || 0) + div.totalAmount;
    monthlyTotalsNet[monthKey] = (monthlyTotalsNet[monthKey] || 0) + netAmount;

    total12MonthForecastGross += div.totalAmount;
    total12MonthForecastNet += netAmount;
  });

  return {
    monthlyTotalsGross,
    monthlyTotalsNet,
    total12MonthForecastGross: Math.round(total12MonthForecastGross * 100) / 100,
    total12MonthForecastNet: Math.round(total12MonthForecastNet * 100) / 100,
    averageMonthlyIncomeNet: Math.round((total12MonthForecastNet / 12) * 100) / 100,
  };
}
