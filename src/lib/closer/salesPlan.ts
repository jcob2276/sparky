export interface SalesSums {
  dials: number;
  appointments: number;
  salesCalls: number;
  salesClosed: number;
}

export interface SalesTargets {
  appointments: number;
  salesCalls: number;
}

export interface SalesPlan {
  apptRate: number | null;
  saleRate: number | null;
  missingAppointments: number;
  missingSalesCalls: number;
  /** Rozmów odebranych potrzebnych do brakujących umówień przy Twoim współczynniku. */
  dialsNeeded: number | null;
  workdaysLeft: number;
  dialsPerDay: number | null;
  /** Rozmów odebranych na cały tydzień, żeby przy tym współczynniku zrobić cel umówień (planowanie nowego tygodnia). */
  dialsForFullWeek: number | null;
  expectedSalesFromMissingCalls: number | null;
}

/** Mniej rozmów to za mała próba, żeby współczynnik coś znaczył. */
const MIN_DIALS_FOR_RATE = 20;
const MIN_CALLS_FOR_RATE = 5;

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Dni robocze (pon–pt) od dziś włącznie do piątku; w weekend 0. */
export function workdaysLeft(today: string): number {
  const day = weekday(today);
  return day >= 1 && day <= 5 ? 6 - day : 0;
}

/**
 * Z Twoich liczb tygodnia: ile rozmów odebranych brakuje do celu umówień i ile to na dzień. Współczynniki liczone tylko
 * z wystarczającej próby, a dzisiejszy dzień liczy się jako jeszcze do zrobienia.
 */
export function buildSalesPlan(sums: SalesSums, targets: SalesTargets, today: string): SalesPlan {
  const apptRate = sums.dials >= MIN_DIALS_FOR_RATE && sums.appointments > 0 ? sums.appointments / sums.dials : null;
  const saleRate = sums.salesCalls >= MIN_CALLS_FOR_RATE ? sums.salesClosed / sums.salesCalls : null;
  const missingAppointments = Math.max(0, targets.appointments - sums.appointments);
  const missingSalesCalls = Math.max(0, targets.salesCalls - sums.salesCalls);
  const dialsNeeded = apptRate ? Math.ceil(missingAppointments / apptRate) : null;
  const left = workdaysLeft(today);
  return {
    apptRate,
    saleRate,
    missingAppointments,
    missingSalesCalls,
    dialsNeeded,
    workdaysLeft: left,
    dialsPerDay: dialsNeeded != null && left > 0 ? Math.ceil(dialsNeeded / left) : null,
    dialsForFullWeek: apptRate ? Math.ceil(targets.appointments / apptRate) : null,
    expectedSalesFromMissingCalls: saleRate != null ? Math.round(missingSalesCalls * saleRate * 10) / 10 : null,
  };
}
