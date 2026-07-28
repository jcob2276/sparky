export type OuraSeriesStatus = 'available' | 'unavailable';

export interface OuraPhasePoint {
  ts: string;
  phase: string | null;
  phase_code: number | null;
}

export interface OuraHeartRatePoint {
  ts: string;
  bpm: number | null;
}

export interface OuraHrvPoint {
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
  phases: OuraPhasePoint[];
  heartRate: OuraHeartRatePoint[];
  hrv: OuraHrvPoint[];
}

const byTimestamp = <T extends { ts: string }>(left: T, right: T) =>
  left.ts.localeCompare(right.ts);

export function mapOuraNightDetails(input: OuraNightDetailsInput): OuraNightDetails {
  const phases = [...input.phases].sort(byTimestamp);
  const heartRate = [...input.heartRate].sort(byTimestamp);
  const hrv = [...input.hrv].sort(byTimestamp);

  return {
    date: input.date,
    phases,
    heartRate,
    hrv,
    phaseStatus: phases.length > 0 ? 'available' : 'unavailable',
    heartRateStatus: heartRate.length > 0 ? 'available' : 'unavailable',
    hrvStatus: hrv.length > 0 ? 'available' : 'unavailable',
  };
}
