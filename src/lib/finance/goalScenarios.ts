import { computeNetWorthGoal, monthlyContributionForTarget } from '@vanguard/domain';

export interface GoalScenarioInput {
  netWorth: number;
  target: number;
  monthlySaving: number;
  expectedReturnPct: number;
  inflationPct: number;
}

interface GoalScenarioRow {
  label: string;
  months: number | null;
}

export interface GoalScenarios {
  returns: GoalScenarioRow[];
  /** Zmiana czasu do celu (w miesiącach) przy odkładaniu o `delta` zł więcej; ujemna to szybciej. */
  extraSavingEffect: { delta: number; monthsDifference: number | null } | null;
  /** Ile trzeba odkładać miesięcznie, żeby zdążyć w 12 miesięcy; null, gdy i tak zdążysz albo cel osiągnięty. */
  savingFor12Months: number | null;
}

const EXTRA_SAVING_PLN = 500;
const FAST_GOAL_MONTHS = 12;

const monthsFor = (input: GoalScenarioInput, returnPct: number, monthlySaving = input.monthlySaving) =>
  computeNetWorthGoal({ netWorth: input.netWorth, target: input.target, monthlySaving, annualReturnPct: returnPct }).monthsToGoal;

/**
 * Trzy odpowiedzi na „kiedy dojdę do celu”: bez zysku (sam wkład), przy zysku równym inflacji i przy Twoim założeniu, plus
 * skutek dodatkowych 500 zł miesięcznie. Czas liczy domenowe `computeNetWorthGoal`, tu tylko układamy scenariusze.
 */
export function buildGoalScenarios(input: GoalScenarioInput): GoalScenarios | null {
  if (input.target <= 0 || input.netWorth >= input.target) return null;
  const returns: GoalScenarioRow[] = [
    { label: 'Bez zysku (sam wkład)', months: monthsFor(input, 0) },
    { label: `Zysk ${input.inflationPct}% (tyle co inflacja)`, months: monthsFor(input, input.inflationPct) },
    { label: `Twoje założenie ${input.expectedReturnPct}% rocznie`, months: monthsFor(input, input.expectedReturnPct) },
  ];
  const base = returns[2].months;
  const plus = monthsFor(input, input.expectedReturnPct, input.monthlySaving + EXTRA_SAVING_PLN);
  const extraSavingEffect = { delta: EXTRA_SAVING_PLN, monthsDifference: base != null && plus != null ? plus - base : null };
  const needsFaster = base == null || base > FAST_GOAL_MONTHS;
  const savingFor12Months = needsFaster
    ? Math.ceil(monthlyContributionForTarget(input.netWorth, input.target, FAST_GOAL_MONTHS / 12, input.expectedReturnPct))
    : null;
  return { returns, extraSavingEffect, savingFor12Months };
}
