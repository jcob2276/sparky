export interface BedtimeTargetInput {
  /** Target wake time in "HH:MM" format (default "07:00") */
  targetWakeTime?: string;
  /** Required actual sleep duration in minutes (e.g. 480 min = 8h) */
  targetSleepMinutes?: number;
  /** Historical sleep efficiency percentage (e.g. 88%) */
  sleepEfficiencyPercent?: number | null;
  /** Historical sleep onset latency in minutes (time to fall asleep, default 15 min) */
  sleepLatencyMinutes?: number | null;
  /** Additional payback debt minutes for tonight (e.g. +35m) */
  paybackAdjustmentMinutes?: number | null;
}

export interface BedtimeTargetResult {
  targetWakeTime: string;
  targetSleepMinutes: number;
  inBedDurationMinutes: number;
  inBedDurationFormatted: string;
  recommendedBedtime: string;
  recommendedWindDownTime: string;
  efficiencyUsed: number;
  latencyUsed: number;
  latencyAssessment: 'optimal' | 'sleep_deprived' | 'prolonged';
  latencyLabel: string;
  recommendation: string;
}

/**
 * Calculates Bedtime Target factoring in Sleep Efficiency and Onset Latency (Bevel Sleep Target engine)
 */
export function calculateBedtimeTarget(input: BedtimeTargetInput = {}): BedtimeTargetResult {
  const wakeTimeStr = input.targetWakeTime && /^\d{1,2}:\d{2}$/.test(input.targetWakeTime)
    ? input.targetWakeTime
    : '07:00';

  const [wakeHour, wakeMin] = wakeTimeStr.split(':').map(Number);
  const wakeTimeMinutes = wakeHour * 60 + wakeMin;

  const baseSleepNeed = input.targetSleepMinutes && input.targetSleepMinutes >= 300 && input.targetSleepMinutes <= 660
    ? input.targetSleepMinutes
    : 480; // 8 hours default

  const debtAdjustment = Math.min(60, Math.max(0, input.paybackAdjustmentMinutes || 0));
  const effectiveSleepNeed = baseSleepNeed + debtAdjustment;

  // Efficiency: clamp between 70% and 98% (default 88%)
  const efficiency = input.sleepEfficiencyPercent && input.sleepEfficiencyPercent >= 60 && input.sleepEfficiencyPercent <= 100
    ? input.sleepEfficiencyPercent / 100
    : 0.88;

  // Latency: time to fall asleep (default 15 min)
  const latency = typeof input.sleepLatencyMinutes === 'number' && input.sleepLatencyMinutes >= 0 && input.sleepLatencyMinutes <= 120
    ? Math.round(input.sleepLatencyMinutes)
    : 15;

  // Total in-bed duration = (effective sleep need / efficiency) + latency
  const rawInBedMinutes = Math.round(effectiveSleepNeed / efficiency) + latency;
  const inBedMinutes = Math.min(720, Math.max(360, rawInBedMinutes));

  // Compute recommended bedtime: wakeTimeMinutes - inBedMinutes (mod 24h = 1440 min)
  let bedtimeMinutes = (wakeTimeMinutes - inBedMinutes) % 1440;
  if (bedtimeMinutes < 0) bedtimeMinutes += 1440;

  const bedHour = Math.floor(bedtimeMinutes / 60);
  const bedMin = bedtimeMinutes % 60;
  const recommendedBedtime = `${String(bedHour).padStart(2, '0')}:${String(bedMin).padStart(2, '0')}`;

  // Wind-down: 45 minutes before in-bed time
  let windDownMinutes = (bedtimeMinutes - 45) % 1440;
  if (windDownMinutes < 0) windDownMinutes += 1440;
  const windHour = Math.floor(windDownMinutes / 60);
  const windMin = windDownMinutes % 60;
  const recommendedWindDownTime = `${String(windHour).padStart(2, '0')}:${String(windMin).padStart(2, '0')}`;

  const inBedHours = Math.floor(inBedMinutes / 60);
  const inBedRemainingMins = inBedMinutes % 60;
  const inBedDurationFormatted = `${inBedHours}h ${inBedRemainingMins > 0 ? `${inBedRemainingMins}m` : ''}`.trim();

  let latencyAssessment: 'optimal' | 'sleep_deprived' | 'prolonged' = 'optimal';
  let latencyLabel = `Latencja ${latency} min (optymalna)`;

  if (latency < 7) {
    latencyAssessment = 'sleep_deprived';
    latencyLabel = `Błyskawiczne zaśnięcie (${latency} min) – deficyt snu`;
  } else if (latency > 25) {
    latencyAssessment = 'prolonged';
    latencyLabel = `Długa latencja (${latency} min) – hiperaktywacja`;
  }

  const recommendation =
    `Aby przespać efektywnie ${Math.round(effectiveSleepNeed / 60)}h ${effectiveSleepNeed % 60}m przy wydajności ${(efficiency * 100).toFixed(0)}%, zaplanuj ${inBedDurationFormatted} w łóżku. Rozpocznij wyciszanie o ${recommendedWindDownTime}.`;

  return {
    targetWakeTime: wakeTimeStr,
    targetSleepMinutes: effectiveSleepNeed,
    inBedDurationMinutes: inBedMinutes,
    inBedDurationFormatted,
    recommendedBedtime,
    recommendedWindDownTime,
    efficiencyUsed: Math.round(efficiency * 100),
    latencyUsed: latency,
    latencyAssessment,
    latencyLabel,
    recommendation,
  };
}
