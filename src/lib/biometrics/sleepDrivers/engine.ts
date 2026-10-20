import { round } from './stats';
import { buildCoverage } from './coverage';
import { buildDriverEffects } from './effects';
import type { NightRecord, SleepDriversInput } from './inputTypes';
import { buildNightRecord, indexInputs } from './nightFeatures';
import { buildTop5Effects } from './top5';
import { OUTCOME_IDS } from './meta';
import type { NightFactors, SleepDriversResult } from './types';

function toNightFactors(night: NightRecord): NightFactors {
  const d = night.drivers;
  const gap = (v: number | null) => (v == null ? null : round(v, 1));
  return {
    date: night.date,
    bedtimeAt: night.bedtimeAt,
    caffeineLastAt: night.clock.caffeineLastAt,
    caffeineGapH: gap(d.caffeine_gap_h),
    mealLastAt: night.clock.mealLastAt,
    mealGapH: gap(d.meal_gap_h),
    trainingAt: night.clock.trainingAt,
    trainingGapH: gap(d.training_gap_h),
    saunaAt: night.clock.saunaAt,
    saunaGapH: gap(d.sauna_gap_h),
    phoneEveningMin: d.phone_evening_min,
    phoneTotalMin: d.phone_total_min,
    pcActiveH: gap(d.pc_active_h),
  };
}

/** Czysty silnik: surowe wejście => korelacje, pokrycie i czynniki ostatniej nocy. Zero I/O. */
export function computeSleepDrivers(input: SleepDriversInput): SleepDriversResult {
  const idx = indexInputs(input);
  const nights = input.nights
    .filter((n) => OUTCOME_IDS.some((id) => n.outcomes[id] != null))
    .map((n) => buildNightRecord(n, idx))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = [...nights].reverse().find((n) => n.bedtimeAt != null) ?? null;
  return {
    nightsAnalyzed: nights.length,
    effects: buildDriverEffects(nights),
    top5Effects: buildTop5Effects(nights, input.top5),
    coverage: buildCoverage(nights),
    lastNight: latest ? toNightFactors(latest) : null,
  };
}
