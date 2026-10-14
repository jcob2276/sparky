export interface RunningActivityInput {
  id: string;
  startDate: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds?:number|null;
  effort?:'race'|'time_trial'|'training';
  averageHeartRate?: number | null;
  sportType?: string | null;
  hrZones?: { z1?: number; z2?: number; z3?: number; z4?: number; z5?: number } | null;
}

export interface RacePrediction {
  distanceName: '5k' | '10k' | 'half_marathon';
  targetDistanceMeters: number;
  predictedSeconds: number;
  predictedPaceSecondsPerKm: number;
  formattedTime: string;
  formattedPace: string;
  scenarioFastSeconds: number;
  scenarioSlowSeconds: number;
  formattedFastTime: string;
  formattedSlowTime: string;
}

export interface RacePredictorResult {
  state: 'ready' | 'insufficient_data' | 'insufficient_volume';
  predictions: RacePrediction[];
  targetGoal10k: {
    goalSeconds: number;
    formattedGoalTime: string;
    gapSeconds: number;
    formattedGap: string;
    targetPaceSecondsPerKm: number;
    formattedTargetPace: string;
    achieved: boolean;
  } | null;
  basisRunsCount: number;
  supportingRuns: Array<{
    id: string;
    date: string;
    distanceKm: number;
    formattedPace: string;
    avgHr: number | null;
  }>;
  applicabilityNote: string;
}

export function formatRaceTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function formatRacePace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '-:--/km';
  const total = Math.round(secondsPerKm);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

/**
 * Predicts race performance deterministically using Riegel's formula:
 * T2 = T1 * (D2 / D1)^1.06
 *
 * Invariants:
 * - Requires an explicitly selected race/time-trial result with elapsed time.
 * - Returns explicit state 'insufficient_data' when data is lacking
 * - Model sensitivity is not a weather forecast or calibrated confidence interval.
 * - Zero hallucinated dates or guaranteed PR claims
 */
export function predictRaceTimes(
  activities: RunningActivityInput[],
  options?: {
    goal10kSeconds?: number;
    cutoffDays?: number;
    asOfDate?: string;
  }
): RacePredictorResult {
  const goal10k = options?.goal10kSeconds ?? 2700; // 45:00 default
  const cutoffDays = options?.cutoffDays ?? 42;
  const asOf = options?.asOfDate ? new Date(options.asOfDate).getTime() : Date.now();
  const maxAgeMs = cutoffDays * 24 * 3600 * 1000;

  // Filter to qualifying runs in the last N days
  const qualifying = activities.filter((act) => {
    const isRun = /^(Run|VirtualRun)$/i.test(act.sportType ?? '');
    if (!isRun) return false;
    if (!Number.isFinite(act.distanceMeters) || act.distanceMeters < 3000 || !Number.isFinite(act.elapsedTimeSeconds) || Number(act.elapsedTimeSeconds)<600
      || Number(act.elapsedTimeSeconds)<act.movingTimeSeconds || !['race','time_trial'].includes(act.effort ?? '')) return false;
    const age = asOf - new Date(act.startDate).getTime();
    return age >= 0 && age <= maxAgeMs;
  });

  const supportingRuns = qualifying
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 8)
    .map((act) => {
      const paceSec = Number(act.elapsedTimeSeconds) / (act.distanceMeters / 1000);
      return {
        id: act.id,
        date: act.startDate.slice(0, 10),
        distanceKm: Math.round((act.distanceMeters / 1000) * 10) / 10,
        formattedPace: formatRacePace(paceSec),
        avgHr: act.averageHeartRate ? Math.round(act.averageHeartRate) : null,
      };
    });

  if (!qualifying.length) {
    return {
      state: 'insufficient_data',
      predictions: [],
      targetGoal10k: {
        goalSeconds: goal10k,
        formattedGoalTime: formatRaceTime(goal10k),
        gapSeconds: 0,
        formattedGap: 'brak danych',
        targetPaceSecondsPerKm: Math.round(goal10k / 10),
        formattedTargetPace: formatRacePace(goal10k / 10),
        achieved: false,
      },
      basisRunsCount: qualifying.length,
      supportingRuns,
      applicabilityNote: `Wybierz potwierdzony start lub próbę na wynik (min. 3 km) z ostatnich ${cutoffDays} dni. Potrzebny jest pełny czas z postojami; zwykłe rozbieganie nie określa możliwości startowych.`,
    };
  }

  // Find the best performance equivalent using Riegel's formula mapped to 10k
  // Score = T * (10000 / D)^1.06
  let best10kEquivalentSeconds = Infinity;
  for (const run of qualifying) {
    const d1 = run.distanceMeters;
    const t1 = Number(run.elapsedTimeSeconds);
    const riegel10k = t1 * Math.pow(10000 / d1, 1.06);
    if (riegel10k < best10kEquivalentSeconds) {
      best10kEquivalentSeconds = riegel10k;
    }
  }

  const distances: Array<{ name: '5k' | '10k' | 'half_marathon'; meters: number }> = [
    { name: '5k', meters: 5000 },
    { name: '10k', meters: 10000 },
    { name: 'half_marathon', meters: 21097 },
  ];

  const predictions: RacePrediction[] = distances.map((target) => {
    const predictedSec = Math.round(best10kEquivalentSeconds * Math.pow(target.meters / 10000, 1.06));
    const paceSec = Math.round(predictedSec / (target.meters / 1000));
    const basis = qualifying.reduce((best,run)=>Number(run.elapsedTimeSeconds)*Math.pow(10000/run.distanceMeters,1.06)<Number(best.elapsedTimeSeconds)*Math.pow(10000/best.distanceMeters,1.06)?run:best);
    const sensitivities = [1.05,1.06,1.08].map(exponent=>Number(basis.elapsedTimeSeconds)*Math.pow(target.meters/basis.distanceMeters,exponent));
    const fastSec = Math.round(Math.min(...sensitivities));
    const slowSec = Math.round(Math.max(...sensitivities));

    return {
      distanceName: target.name,
      targetDistanceMeters: target.meters,
      predictedSeconds: predictedSec,
      predictedPaceSecondsPerKm: paceSec,
      formattedTime: formatRaceTime(predictedSec),
      formattedPace: formatRacePace(paceSec),
      scenarioFastSeconds: fastSec,
      scenarioSlowSeconds: slowSec,
      formattedFastTime: formatRaceTime(fastSec),
      formattedSlowTime: formatRaceTime(slowSec),
    };
  });

  const pred10k = predictions.find((p) => p.distanceName === '10k')?.predictedSeconds ?? best10kEquivalentSeconds;
  const gap = pred10k - goal10k;
  const predictedWithinGoal = gap <= 0;

  return {
    state: 'ready',
    predictions,
    targetGoal10k: {
      goalSeconds: goal10k,
      formattedGoalTime: formatRaceTime(goal10k),
      gapSeconds: Math.abs(gap),
      formattedGap: predictedWithinGoal
        ? `Prognoza poniżej celu o ${formatRaceTime(Math.abs(gap))}; cel wymaga rzeczywistego wyniku`
        : `Prognoza powyżej celu o ${formatRaceTime(gap)} (${((gap / 10)).toFixed(1)} s/km)`,
      targetPaceSecondsPerKm: Math.round(goal10k / 10),
      formattedTargetPace: formatRacePace(goal10k / 10),
      achieved:false,
    },
    basisRunsCount: qualifying.length,
    supportingRuns,
    applicabilityNote: `Model Riegela na bazie ${qualifying.length} potwierdzonych prób z ostatnich ${cutoffDays} dni. Zakres pokazuje wrażliwość na wykładnik 1.05–1.08, nie przedział ufności ani wpływ pogody. Prognoza nie zalicza celu.`,
  };
}
