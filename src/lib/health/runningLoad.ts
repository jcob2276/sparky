import { formatWarsawDate, shiftDateStr } from '../date';
import type { WorkoutSessionInput } from './muscleRecovery';

export interface RunRow {
  start_date: string | null;
  distance: number | null;
  moving_time: number | null;
  sport_type: string | null;
  hr_avg: number | null;
  hr_max: number | null;
}

export type RunIntensity = 'easy' | 'tempo' | 'hard';

interface RunSummary {
  /** Dzień (Europa/Warszawa), RRRR-MM-DD. */
  day: string;
  /** Pełny znacznik czasu startu — do modelu zmęczenia. */
  startedAt: string;
  km: number;
  minutes: number;
  avgHr: number | null;
  /** Obciążenie tętnem (TRIMP): czas × intensywność względem rezerwy tętna, rośnie wykładniczo z wysiłkiem. */
  load: number;
  intensity: RunIntensity;
}

export interface RunningLoad {
  /** Suma obciążenia z ostatnich 7 dni. */
  load7: number;
  km7: number;
  runs7: number;
  /** Typowe (mediana) tygodniowe obciążenie z trzech wcześniejszych tygodni; null, gdy brak historii. */
  avgWeeklyLoad: number | null;
  /** Obciążenie w kolejnych tygodniach, od najstarszego do bieżącego (4 wartości). */
  weeks: number[];
  recent: RunSummary[];
  verdict: string;
  /** Biegi jako sesje dla modelu zmęczenia mięśni nóg. */
  fatigueInput: WorkoutSessionInput[];
}

const RUN_SPORTS = new Set(['Run', 'TrailRun', 'VirtualRun']);
const REST_HR = 50;
const DEFAULT_MAX_HR = 190;
/** Przelicznik obciążenia biegowego na bodziec dla mięśni nóg w modelu zmęczenia (twardy bieg ~100 pkt ≈ 60% zmęczenia nóg). */
const LEG_STIMULUS_PER_LOAD = 72;
const LEG_TAGS = ['czworogłowe', 'dwugłowe ud', 'pośladki', 'łydki'];
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Banister TRIMP z tętna średniego; bez tętna zakładamy umiarkowany wysiłek. */
export function runLoad(minutes: number, avgHr: number | null, maxHr: number): { load: number; intensity: RunIntensity } {
  const reserve = Math.max(1, maxHr - REST_HR);
  const hrr = avgHr == null ? 0.6 : Math.min(1, Math.max(0, (avgHr - REST_HR) / reserve));
  const load = minutes * hrr * 0.64 * Math.exp(1.92 * hrr);
  const intensity: RunIntensity = hrr >= 0.85 ? 'hard' : hrr >= 0.72 ? 'tempo' : 'easy';
  return { load: Math.round(load), intensity };
}

function verdictFor(load7: number, avg: number | null): string {
  if (load7 === 0) return 'Bez biegania w tych 7 dniach';
  if (avg == null || avg < 20) return 'Za mało historii, żeby porównać';
  const ratio = load7 / avg;
  if (ratio > 1.4) return 'Dużo ciężej niż zwykle — uważaj na stawy';
  if (ratio >= 0.8) return 'W swoim rytmie';
  return 'Lżej niż zwykle';
}

/** Obciążenie biegowe z ostatnich 5 tygodni liczone z tętna, nie z kilometrów: 10 km interwałów bywa cięższe niż 15 km spokojnie. */
export function buildRunningLoad(rows: RunRow[], today: string): RunningLoad {
  const maxHr = Math.max(DEFAULT_MAX_HR, ...rows.map((r) => r.hr_max ?? 0));
  const runs: RunSummary[] = rows.flatMap((row) => {
    if (!row.start_date || !RUN_SPORTS.has(row.sport_type ?? '')) return [];
    const parsed = Date.parse(row.start_date);
    if (!Number.isFinite(parsed)) return [];
    const minutes = Math.round((row.moving_time ?? 0) / 60);
    const { load, intensity } = runLoad(minutes, row.hr_avg, maxHr);
    return [{ day: formatWarsawDate(new Date(parsed)), startedAt: row.start_date, km: round1((row.distance ?? 0) / 1000), minutes, avgHr: row.hr_avg, load, intensity }];
  });

  const weekStart = (offsetWeeks: number) => shiftDateStr(today, -6 - 7 * offsetWeeks);
  const sumBetween = (pick: (r: RunSummary) => number, from: string, to: string) =>
    runs.filter((r) => r.day >= from && r.day <= to).reduce((sum, r) => sum + pick(r), 0);
  const loadWeek = (offset: number) => Math.round(sumBetween((r) => r.load, weekStart(offset), offset === 0 ? today : shiftDateStr(weekStart(offset), 6)));

  const weeks = [3, 2, 1, 0].map(loadWeek);
  const load7 = weeks[3];
  const hasHistory = runs.some((r) => r.day < weekStart(0));
  // Mediana zamiast średniej: jeden wyjątkowy tydzień (np. maraton) nie zawyża „zwykłego” tygodnia.
  const avgWeeklyLoad = hasHistory ? [weeks[0], weeks[1], weeks[2]].sort((x, y) => x - y)[1] : null;
  const inWeek = runs.filter((r) => r.day >= weekStart(0) && r.day <= today);

  return {
    load7,
    km7: round1(inWeek.reduce((sum, r) => sum + r.km, 0)),
    runs7: inWeek.length,
    avgWeeklyLoad,
    weeks,
    recent: [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3),
    verdict: verdictFor(load7, avgWeeklyLoad),
    fatigueInput: runsToFatigueInput(runs),
  };
}

/** Każdy bieg jako „ćwiczenie” na mięśnie nóg o sile bodźca proporcjonalnej do obciążenia tętnem. */
function runsToFatigueInput(runs: RunSummary[]): WorkoutSessionInput[] {
  return runs
    .filter((r) => r.load > 0)
    .map((r) => ({
      date: r.startedAt,
      exercises: [{ name: 'Bieg', muscleTags: LEG_TAGS, sets: [{ weightKg: 1, reps: Math.round(r.load * LEG_STIMULUS_PER_LOAD) }] }],
    }));
}
