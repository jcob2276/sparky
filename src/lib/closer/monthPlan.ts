/** Prowizja za sprzedaż zamkniętą samodzielnie: 15% od netto oferty 5,5 tys. brutto (VAT 23%). */
const OWN_SALE_PAY = (5500 / 1.23) * 0.15;
const MEETING_PAY = 100;
/** Ile spotkań da się umówić w 60-minutowym bloku. */
export const MEETINGS_PER_BLOCK = 5;

export interface MonthPlanConfig {
  /** Pierwszy dzień planu, `YYYY-MM-DD`; plan kończy się z miesiącem. */
  startDate: string;
  targetPln: number;
  /** Część umówionych spotkań, która się odbywa (0–1). */
  showRate: number;
  /** Tydzień z co najmniej tyloma dniami roboczymi wymaga jednej sprzedaży. */
  minSalesWeekDays: number;
}

export interface PlanDay {
  date: string;
  /** Dzień roboczy (pn–pt) ma minimum; sobota i niedziela to rezerwa do nadrabiania. */
  kind: 'plan' | 'reserve';
  /** Minimum umówionych spotkań tego dnia. */
  target: number;
  /** Narastająco do końca tego dnia roboczego. */
  cumulative: number;
  /** Przybliżony czas umawiania przy 5 spotkaniach na godzinę. */
  minutes: number;
}

interface PlanWeek {
  /** 7 komórek pn–nd; `null` poza zakresem planu. */
  cells: Array<PlanDay | null>;
  bookedMin: number;
  salesMin: number;
}

export interface MonthPlan {
  weeks: PlanWeek[];
  totals: { sales: number; held: number; booked: number; payout: number; planDays: number };
}

const DAY_MS = 86_400_000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (time: number) => {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const weekday = (date: string) => (new Date(toTime(date)).getUTCDay() + 6) % 7;

export function monthEnd(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return toDate(Date.UTC(y, m, 0));
}

/**
 * Plan miesiąca: ile sprzedaży (minimum jedna na pełny tydzień) i odbytych spotkań (po 100 zł) daje cel,
 * ile trzeba umówić przy zadanym odsetku odbytych oraz jak rozłożyć to po dniach roboczych z zapasem na początku.
 */
export function buildMonthPlan(config: MonthPlanConfig): MonthPlan {
  const end = monthEnd(config.startDate);
  const firstMonday = toTime(config.startDate) - weekday(config.startDate) * DAY_MS;
  const spans: Array<Array<string | null>> = [];
  for (let weekStart = firstMonday; weekStart <= toTime(end); weekStart += 7 * DAY_MS) {
    spans.push(Array.from({ length: 7 }, (_, i) => {
      const date = toDate(weekStart + i * DAY_MS);
      return date >= config.startDate && date <= end ? date : null;
    }));
  }

  const isPlanDay = (date: string | null) => date !== null && weekday(date) < 5;
  const sales = spans.filter((week) => week.filter(isPlanDay).length >= config.minSalesWeekDays).length;
  const held = Math.max(0, Math.ceil((config.targetPln - sales * OWN_SALE_PAY) / MEETING_PAY - 1e-9));
  const booked = Math.ceil(held / config.showRate - 1e-9);
  const planDays = spans.flat().filter(isPlanDay).length;

  let index = 0;
  let previous = 0;
  const weeks = spans.map((week): PlanWeek => {
    const cells = week.map((date): PlanDay | null => {
      if (date === null) return null;
      if (!isPlanDay(date)) return { date, kind: 'reserve', target: 0, cumulative: previous, minutes: 0 };
      index += 1;
      const cumulative = Math.ceil((booked * index) / planDays - 1e-9);
      const target = cumulative - previous;
      previous = cumulative;
      return { date, kind: 'plan', target, cumulative, minutes: Math.round((target / MEETINGS_PER_BLOCK) * 60) };
    });
    return {
      cells,
      bookedMin: cells.reduce((sum, cell) => sum + (cell?.target ?? 0), 0),
      salesMin: week.filter(isPlanDay).length >= config.minSalesWeekDays ? 1 : 0,
    };
  });

  return { weeks, totals: { sales, held, booked, payout: held * MEETING_PAY + sales * OWN_SALE_PAY, planDays } };
}

/** Refleksja liczy się jako zamykająca dzień od tylu znaków. */
export const REFLECTION_MIN_CHARS = 15;
/** Dzienne minima wzrostu: self-refleksja i nauka (minuty). */
export const REFLECTION_TARGET_MIN = 15;
export const LEARNING_TARGET_MIN = 30;

export interface DayActual {
  dials: number;
  appointments: number;
  salesCalls: number;
  salesClosed: number;
  workMinutes: number;
  reflectionMinutes: number;
  learningMinutes: number;
  /** Tekst refleksji dnia (kolumna `notes`). */
  reflection: string;
}

export const EMPTY_DAY: DayActual = {
  dials: 0, appointments: 0, salesCalls: 0, salesClosed: 0, workMinutes: 0, reflectionMinutes: 0, learningMinutes: 0, reflection: '',
};

export const isReflected = (actual: DayActual | undefined) => (actual?.reflection.trim().length ?? 0) >= REFLECTION_MIN_CHARS;

/** Close rate jako ułamek 0–1; `null` bez żadnej rozmowy sprzedażowej. */
export function closeRate(salesClosed: number, salesCalls: number): number | null {
  return salesCalls > 0 ? salesClosed / salesCalls : null;
}

export interface PlanProgress {
  bookedDone: number;
  salesDone: number;
  salesCallsDone: number;
  closeRate: number | null;
  dialsDone: number;
  workMinutesDone: number;
  reflectionMinutesDone: number;
  learningMinutesDone: number;
  /** Dni z zapisaną refleksją i ile dni planu już minęło lub trwa (z rezerwą, jeśli ją wpisano). */
  reflectedDays: number;
  elapsedPlanDays: number;
  /** Brakujące umówienia względem minimum dni roboczych sprzed dzisiaj (weekend i nadwyżki je zmniejszają). */
  backlog: number;
  todayTarget: number;
  todayNeeded: number;
  todayBlocks: number;
}

export function summarizeProgress(plan: MonthPlan, actuals: Record<string, DayActual>, today: string): PlanProgress {
  const days = plan.weeks.flatMap((week) => week.cells).filter((cell): cell is PlanDay => cell !== null);
  const sum = (pick: (a: DayActual) => number, before?: string) => Object.entries(actuals)
    .filter(([date]) => date >= days[0].date && (before === undefined || date < before))
    .reduce((total, [, actual]) => total + pick(actual), 0);
  const plannedBefore = days.filter((day) => day.kind === 'plan' && day.date < today).reduce((total, day) => total + day.target, 0);
  const backlog = Math.max(0, plannedBefore - sum((a) => a.appointments, today));
  const todayTarget = days.find((day) => day.date === today && day.kind === 'plan')?.target ?? 0;
  const todayNeeded = todayTarget + backlog;
  const salesDone = sum((a) => a.salesClosed);
  const elapsedPlanDays = days.filter((day) => day.kind === 'plan' && day.date <= today).length;
  const reflectedDays = Object.entries(actuals).filter(([date, actual]) => date >= days[0].date && isReflected(actual)).length;
  const salesCallsDone = sum((a) => a.salesCalls);
  return {
    bookedDone: sum((a) => a.appointments),
    salesDone,
    salesCallsDone,
    closeRate: closeRate(salesDone, salesCallsDone),
    dialsDone: sum((a) => a.dials),
    workMinutesDone: sum((a) => a.workMinutes),
    reflectionMinutesDone: sum((a) => a.reflectionMinutes),
    learningMinutesDone: sum((a) => a.learningMinutes),
    reflectedDays,
    elapsedPlanDays,
    backlog,
    todayTarget,
    todayNeeded,
    todayBlocks: Math.ceil(todayNeeded / MEETINGS_PER_BLOCK),
  };
}
