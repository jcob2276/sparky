import { useMemo } from 'react';
import {
  FINANCE_ACCOUNT_LABELS,
  computeAllocation,
  computeFireMetrics,
  computeIncomeBreakdown,
  computeNetWorthGoal,
  computeRunwayFloor,
  computeSafeToSpend,
  computeScenarios,
  resolveEffectiveIncome,
  type FireInputs,
} from '@vanguard/domain';
import { getTodayWarsaw } from '../../lib/date';
import type { FinanceBundle } from '../../lib/financeApi';
import { sumAccountBalances } from '../../lib/financeApi';
import { buildFinanceCashflowMonth } from '../../lib/finance/cashflowEvents';

function daysLeftInWarsawMonth(today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return Math.max(1, lastDay - d + 1);
}

function spentThisMonth(transactions: FinanceBundle['transactions'], today: string): number {
  const prefix = today.slice(0, 7);
  return transactions
    .filter((t) => t.kind === 'expense' && t.transaction_date.startsWith(prefix))
    .reduce((n, t) => n + Math.abs(t.amount), 0);
}

function earnedThisMonth(transactions: FinanceBundle['transactions'], today: string): number {
  const prefix = today.slice(0, 7);
  return transactions
    .filter((t) => t.kind === 'income' && t.transaction_date.startsWith(prefix))
    .reduce((n, t) => n + Math.abs(t.amount), 0);
}

export function useFinanceMetrics(bundle: FinanceBundle | undefined, portfolioValue = 0) {
  return useMemo(() => {
    if (!bundle) return null;

    const { profile, accounts, subscriptions, bills, incomeSources, transactions } = bundle;
    const accountTotals = sumAccountBalances(accounts);
    const liquid = accountTotals.liquid;
    const investments = accountTotals.investments + portfolioValue;
    const netWorth = liquid + investments;
    const subsMonthly = subscriptions.filter((s) => s.is_active).reduce((n, s) => n + s.amount_monthly, 0);
    const billsMonthly = bills.filter((b) => b.is_active).reduce((n, b) => n + b.amount, 0);
    const incomeBreakdown = computeIncomeBreakdown(incomeSources);
    const effectiveIncome = resolveEffectiveIncome(profile.monthly_income, incomeBreakdown);
    const effectiveExpenses = profile.monthly_expenses > 0
      ? profile.monthly_expenses
      : subsMonthly + billsMonthly;

    const runway = computeRunwayFloor(liquid, effectiveExpenses, incomeBreakdown);
    const today = getTodayWarsaw();
    const monthKey = today.slice(0, 7);

    const fireInput: FireInputs = {
      monthlyExpenses: effectiveExpenses,
      monthlyIncome: effectiveIncome,
      currentSavings: netWorth,
      expectedReturnPct: profile.expected_return_pct,
      inflationPct: profile.inflation_pct,
      safeWithdrawalRatePct: profile.safe_withdrawal_rate_pct,
      yearsToRetirement: profile.years_to_retirement,
    };

    const fire = computeFireMetrics(fireInput);
    const spentMonth = spentThisMonth(transactions, today);
    const safeToSpend = computeSafeToSpend({
      liquid,
      monthlyIncome: effectiveIncome,
      monthlyExpenses: effectiveExpenses,
      emergencyTargetMonths: profile.emergency_target_months,
      spentThisMonth: spentMonth,
      daysLeftInMonth: daysLeftInWarsawMonth(today),
    });

    const allocation = computeAllocation(accounts, FINANCE_ACCOUNT_LABELS);
    const monthlySaving = Math.max(0, effectiveIncome - effectiveExpenses);
    const goal = computeNetWorthGoal({
      netWorth,
      target: profile.net_worth_target,
      monthlySaving,
      annualReturnPct: profile.expected_return_pct,
    });
    const emergencyTarget = effectiveExpenses * profile.emergency_target_months;
    const emergency = {
      months: effectiveExpenses > 0 ? liquid / effectiveExpenses : null,
      targetMonths: profile.emergency_target_months,
      target: emergencyTarget,
      missing: Math.max(0, emergencyTarget - liquid),
      progressPct: emergencyTarget > 0 ? Math.min(100, (liquid / emergencyTarget) * 100) : 0,
    };
    const cashflowMonth = buildFinanceCashflowMonth(bundle, monthKey, liquid);

    const scenarios = computeScenarios(fireInput, [
      {
        label: 'Tylko UoZ',
        patch: { monthlyIncome: incomeBreakdown.baseMonthly + incomeBreakdown.passiveMonthly },
      },
      {
        label: 'Miesiąc z prowizją',
        patch: { monthlyIncome: effectiveIncome + incomeBreakdown.variableMonthly },
      },
      { label: 'Cięcie wydatków −500 zł', patch: { monthlyExpenses: Math.max(0, effectiveExpenses - 500) } },
      { label: 'Wydatek jednorazowy 20k', patch: { currentSavings: Math.max(0, netWorth - 20000) } },
    ]);

    return {
      hasBudget: bundle.hasProfile && effectiveExpenses > 0,
      netWorth,
      liquid,
      investments,
      effectiveIncome,
      effectiveExpenses,
      incomeBreakdown,
      runway,
      subsMonthly,
      billsMonthly,
      fireInput,
      fire,
      safeToSpend,
      spentThisMonth: spentMonth,
      earnedThisMonth: earnedThisMonth(transactions, today),
      allocation,
      goal,
      monthlySaving,
      netWorthTarget: profile.net_worth_target,
      emergency,
      cashflowMonth,
      monthKey,
      scenarios,
    };
  }, [bundle, portfolioValue]);
}

export type FinanceMetrics = NonNullable<ReturnType<typeof useFinanceMetrics>>;
