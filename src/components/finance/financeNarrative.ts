import { formatMonths, formatPln } from '../../lib/finance/formatMoney';
import type { FinanceMetrics } from './useFinanceMetrics';

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

export function buildTodayHeadline(metrics: FinanceMetrics): string {
  if (!metrics.hasBudget) return '—';
  return formatPln(metrics.safeToSpend.safeToday);
}

export function buildTodayContext(metrics: FinanceMetrics): string {
  if (!metrics.hasBudget) return 'Wpisz plan wydatków w Przepływach, żeby obliczyć kwotę do wydania.';
  const { safeToSpend, runway, incomeBreakdown, effectiveExpenses } = metrics;

  if (safeToSpend.emergencyBlocked) {
    return `Budujesz poduszkę — na dziś liczę ostrożniej. W tym miesiącu zostało około ${formatPln(safeToSpend.safeThisMonth)}.`;
  }

  const monthTail = `W tym miesiącu zostało około ${formatPln(safeToSpend.safeThisMonth)}.`;

  if (runway.baseCoversExpenses) {
    return `Przy samym UoZ (${formatPln(incomeBreakdown.baseMonthly)}/mies.) wydatki około ${formatPln(effectiveExpenses)} się spinają. ${monthTail}`;
  }

  const runwayText = formatMonths(runway.runwayWithoutDealMonths ?? 0);
  return `Bez prowizji masz rezerwę na około ${runwayText}. ${monthTail}`;
}
