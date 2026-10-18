type OuraSeriesStatus = 'available' | 'unavailable';

interface OuraPhasePoint {
  ts: string;
  phase: string | null;
  phase_code: number | null;
}

interface OuraHeartRatePoint {
  ts: string;
  bpm: number | null;
}

interface OuraHrvPoint {
  ts: string;
  hrv: number | null;
}

export interface OuraNightDetails {
  date: string;
  phases: OuraPhasePoint[];
  heartRate: OuraHeartRatePoint[];
  hrv: OuraHrvPoint[];
  phaseStatus: OuraSeriesStatus;
  heartRateStatus: OuraSeriesStatus;
  hrvStatus: OuraSeriesStatus;
}

interface OuraNightDetailsInput {
  date: string;
  bedtimeStart?: string | null;
  bedtimeEnd?: string | null;
  phases: OuraPhasePoint[];
  heartRate: OuraHeartRatePoint[];
  hrv: OuraHrvPoint[];
}

const byTimestamp = <T extends { ts: string }>(left: T, right: T) =>
  left.ts.localeCompare(right.ts);

function withinInterval<T extends { ts: string }>(
  points: T[],
  start: string | null | undefined,
  end: string | null | undefined,
): T[] {
  const startMs = start ? Date.parse(start) : Number.NaN;
  const endMs = end ? Date.parse(end) : Number.NaN;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return points;
  return points.filter((point) => {
    const pointMs = Date.parse(point.ts);
    return Number.isFinite(pointMs) && pointMs >= startMs && pointMs <= endMs;
  });
}

export function mapOuraNightDetails(input: OuraNightDetailsInput): OuraNightDetails {
  const phases = withinInterval(input.phases, input.bedtimeStart, input.bedtimeEnd).sort(byTimestamp);
  const heartRate = withinInterval(input.heartRate, input.bedtimeStart, input.bedtimeEnd).sort(byTimestamp);
  const hrv = withinInterval(input.hrv, input.bedtimeStart, input.bedtimeEnd).sort(byTimestamp);

  const hasPhases = phases.some((point) => point.phase != null || point.phase_code != null);
  const hasHeartRate = heartRate.some((point) => point.bpm != null && point.bpm > 0);
  const hasHrv = hrv.some((point) => point.hrv != null && point.hrv > 0);

  return {
    date: input.date,
    phases,
    heartRate,
    hrv,
    phaseStatus: hasPhases ? 'available' : 'unavailable',
    heartRateStatus: hasHeartRate ? 'available' : 'unavailable',
    hrvStatus: hasHrv ? 'available' : 'unavailable',
  };
}
