/** Prowizja za sprzedaż zamkniętą samodzielnie: 15% od netto oferty 5,5 tys. brutto (VAT 23%). */
const OWN_SALE_PAY = (5500 / 1.23) * 0.15;
const MEETING_PAY = 100;

export interface MonthPlanConfig {
  /** Pierwszy dzień planu, `YYYY-MM-DD`; plan kończy się z miesiącem. */
  startDate: string;
  targetPln: number;
  /** Część umówionych spotkań, która się odbywa (0–1). */
  showRate: number;
  /** Tydzień z co najmniej tyloma dniami roboczymi wymaga jednej sprzedaży. */
  minSalesWeekDays: number;
  /** Przeliczenie w trakcie miesiąca: od `from` minimum liczy się od `done` umówionych, a nie od zera; wcześniejsze dni zostają jak w pierwotnym planie. */
  rebase?: { from: string; done: number };
}

export interface PlanDay {
  date: string;
  /** Dzień roboczy (pn–pt) ma minimum; sobota i niedziela to rezerwa, ich wpisy skracają kolejne dni. */
  kind: 'plan' | 'reserve';
  /** Minimum umówionych spotkań tego dnia, liczone od nowa po każdym zamkniętym dniu i po każdej sprzedaży. */
  target: number;
  /** Minimum z pierwotnego planu, bez wpisanych liczb; różnica do `target` to nadrabianie albo zapas. */
  planned: number;
}

interface PlanWeek {
  /** 7 komórek pn–nd; `null` poza zakresem planu. */
  cells: Array<PlanDay | null>;
  bookedMin: number;
  salesMin: number;
}

export interface MonthPlan {
  weeks: PlanWeek[];
  /** Sumy miesiąca na dziś: wpisane liczby, brakująca sprzedaż i reszta do umówienia. `sales` to sprzedaże z pierwotnego planu (min. 1 na tydzień). */
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

interface Snapshot {
  done: number;
  remaining: number;
  heldNeeded: number;
  salesDone: number;
  futureSales: number;
}

/**
 * Plan miesiąca: ile sprzedaży (minimum jedna na pełny tydzień) i odbytych spotkań (po 100 zł) daje cel, ile trzeba umówić
 * przy zadanym odsetku odbytych oraz jak rozłożyć to po dniach roboczych.
 *
 * Z `actuals` i `today` plan liczy się na bieżąco: dzień przed dzisiejszym albo zamknięty refleksją liczy się tym, co wpisano
 * (brak rozkłada się na pozostałe dni robocze, nadwyżka je skraca), a dzień otwarty i przyszłe dni zakładają, że minimum zostanie wykonane.
 * Tydzień bez sprzedaży, który już minął, podnosi liczbę potrzebnych spotkań, bo cel w złotych zostaje ten sam.
 */
export function buildMonthPlan(config: MonthPlanConfig, actuals: Record<string, DayActual> = {}, today = ''): MonthPlan {
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
  const qualifies = spans.map((week) => week.filter(isPlanDay).length >= config.minSalesWeekDays);
  const sales = qualifies.filter(Boolean).length;
  const heldFor = (salesCount: number) => Math.max(0, Math.ceil((config.targetPln - salesCount * OWN_SALE_PAY) / MEETING_PAY - 1e-9));
  const held = heldFor(sales);
  const booked = Math.ceil(held / config.showRate - 1e-9);
  const planDays = spans.flat().filter(isPlanDay).length;

  const from = config.rebase?.from ?? config.startDate;
  const startDone = config.rebase?.done ?? 0;
  const dated = spans.flatMap((week, w) => week.flatMap((date) => (date === null ? [] : [{ date, w }])));
  const rollDays = dated.filter(({ date }) => isPlanDay(date) && date >= from).length;
  const lastPlanDay = spans.map((week) => week.filter(isPlanDay).pop() ?? '');

  // Dni przed przeliczeniem zostają w pierwotnym rozkładzie całego planu.
  const staticTargets = new Map<string, number>();
  let index = 0;
  let previous = 0;
  for (const { date } of dated) {
    if (!isPlanDay(date) || date >= from) continue;
    index += 1;
    const cumulative = Math.ceil((booked * index) / planDays - 1e-9);
    staticTargets.set(date, cumulative - previous);
    previous = cumulative;
  }

  /** Minimum każdego dnia roboczego od `from`: brakujące spotkania dzielone równo na pozostałe dni robocze. */
  const roll = (entered: Record<string, DayActual>, now: string) => {
    const targets = new Map<string, number>();
    const weekSales = spans.map(() => 0);
    let done = startDone;
    let salesDone = 0;
    let remainingDays = rollDays;
    let snapshot: Snapshot | undefined;
    for (const { date, w } of dated) {
      const actual = entered[date];
      let target = 0;
      if (date >= from && isPlanDay(date)) {
        const futureSales = qualifies.slice(w + 1).filter(Boolean).length + (qualifies[w] && weekSales[w] === 0 ? 1 : 0);
        const heldNeeded = heldFor(salesDone + futureSales);
        const remaining = Math.max(0, Math.ceil((heldNeeded - done * config.showRate) / config.showRate - 1e-9));
        target = Math.max(0, Math.ceil(remaining / remainingDays - 1e-9));
        remainingDays -= 1;
        targets.set(date, target);
        if (!snapshot && date >= now) snapshot = { done, remaining, heldNeeded, salesDone, futureSales };
      }
      if (date >= from) {
        const appointments = actual?.appointments ?? 0;
        done += date < now || isReflected(actual) ? appointments : Math.max(appointments, target);
      }
      const sold = actual?.salesClosed ?? 0;
      salesDone += sold;
      weekSales[w] += sold;
      // Tydzień, który jeszcze trwa, zakłada swoją jedną sprzedaż; minięty bez sprzedaży to brak.
      if (date === lastPlanDay[w] && qualifies[w] && weekSales[w] === 0 && date >= now) {
        salesDone += 1;
        weekSales[w] += 1;
      }
    }
    snapshot ??= { done, remaining: 0, heldNeeded: heldFor(salesDone), salesDone, futureSales: 0 };
    return { targets, snapshot };
  };

  const base = roll({}, '');
  const live = roll(actuals, today);
  const { snapshot } = live;

  const weeks = spans.map((week, w): PlanWeek => {
    const cells = week.map((date): PlanDay | null => {
      if (date === null) return null;
      if (!isPlanDay(date)) return { date, kind: 'reserve', target: 0, planned: 0 };
      const planned = base.targets.get(date) ?? staticTargets.get(date) ?? 0;
      return { date, kind: 'plan', target: live.targets.get(date) ?? planned, planned };
    });
    return { cells, bookedMin: cells.reduce((sum, cell) => sum + (cell?.target ?? 0), 0), salesMin: qualifies[w] ? 1 : 0 };
  });

  return {
    weeks,
    totals: {
      sales,
      held: snapshot.heldNeeded,
      booked: snapshot.done + snapshot.remaining,
      payout: snapshot.heldNeeded * MEETING_PAY + (snapshot.salesDone + snapshot.futureSales) * OWN_SALE_PAY,
      planDays,
    },
  };
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
  /** Dziś to dzień roboczy z minimum; sobota i niedziela nie mają celu. */
  todayIsPlanDay: boolean;
  /** Minimum na dziś z uwzględnieniem wszystkiego, co przed dzisiaj, oraz to samo minimum z pierwotnego planu. */
  todayTarget: number;
  todayPlanned: number;
  todayDone: number;
  todayLeft: number;
}

export function summarizeProgress(plan: MonthPlan, actuals: Record<string, DayActual>, today: string): PlanProgress {
  const days = plan.weeks.flatMap((week) => week.cells).filter((cell): cell is PlanDay => cell !== null);
  const sum = (pick: (a: DayActual) => number) => Object.entries(actuals)
    .filter(([date]) => date >= days[0].date)
    .reduce((total, [, actual]) => total + pick(actual), 0);
  const todayDay = days.find((day) => day.date === today && day.kind === 'plan');
  const todayTarget = todayDay?.target ?? 0;
  const todayDone = actuals[today]?.appointments ?? 0;
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
    todayIsPlanDay: todayDay !== undefined,
    todayTarget,
    todayPlanned: todayDay?.planned ?? 0,
    todayDone,
    todayLeft: Math.max(0, todayTarget - todayDone),
  };
}
