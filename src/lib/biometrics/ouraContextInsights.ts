import { estimateCaffeineMg,
  evaluateCognitiveProfile,
  evaluateLateNightImpact,
  formatPhoneUsageDuration,
  type LateNightImpact,
  type PhoneCognitiveProfile, TIMEZONE } from '@vanguard/domain';

type ContextStatus = 'available' | 'unavailable';

interface PhoneUsageInput {
  total_minutes: number | null;
  late_night_minutes: number | null;
  social_minutes?: number | null;
  messaging_minutes?: number | null;
  entertainment_minutes?: number | null;
  ai_minutes?: number | null;
  browser_minutes?: number | null;
  other_minutes?: number | null;
  unlocks?: number | null;
  top_apps?: Array<{ app: string; pkg: string; min: number }> | null | unknown;
}

interface WorkoutInput {
  duration_minutes: number | null;
  hr_strain_score: number | null;
  end_time: string | null;
}

interface FoodEntryInput {
  name: string;
  calories: number | null;
  food_quality_score: number | null;
  logged_at: string | null;
}

interface OuraContextInput {
  sleepDate: string;
  bedtimeStart: string | null;
  phoneUsage: PhoneUsageInput | null;
  workouts: WorkoutInput[];
  foodEntries: FoodEntryInput[];
}

const WARSAW_TIME = new Intl.DateTimeFormat('pl-PL', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatTimestamp(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : WARSAW_TIME.format(date);
}

function resolveScreenInsights(phoneUsage: PhoneUsageInput | null) {
  const hasPhoneTotal = typeof phoneUsage?.total_minutes === 'number'
    && Number.isFinite(phoneUsage.total_minutes)
    && phoneUsage.total_minutes >= 0;
  const safeLateNightMinutes = typeof phoneUsage?.late_night_minutes === 'number'
    && Number.isFinite(phoneUsage.late_night_minutes)
    && phoneUsage.late_night_minutes >= 0
    ? Math.round(phoneUsage.late_night_minutes)
    : null;
  const lateNightImpact: LateNightImpact | null = safeLateNightMinutes != null
    ? evaluateLateNightImpact(safeLateNightMinutes)
    : null;
  const cognitiveProfile: PhoneCognitiveProfile | null = hasPhoneTotal && phoneUsage
    ? evaluateCognitiveProfile({
        total_minutes: phoneUsage.total_minutes,
        social_minutes: phoneUsage.social_minutes,
        messaging_minutes: phoneUsage.messaging_minutes,
        entertainment_minutes: phoneUsage.entertainment_minutes,
        ai_minutes: phoneUsage.ai_minutes,
        browser_minutes: phoneUsage.browser_minutes,
        other_minutes: phoneUsage.other_minutes,
        unlocks: phoneUsage.unlocks,
      })
    : null;
  const topApps = Array.isArray(phoneUsage?.top_apps)
    ? (phoneUsage.top_apps as Array<{ app: string; pkg: string; min: number }>)
    : [];

  if (!hasPhoneTotal || !phoneUsage) {
    return {
      status: 'unavailable' as ContextStatus,
      source: 'phone_usage_daily' as const,
      totalMinutes: null,
      lateNightMinutes: null,
      formattedTotal: null,
      lateNightImpact: null,
      cognitiveProfile: null,
      categoryMinutesComplete: false,
      topApps: [],
      socialMinutes: 0,
      messagingMinutes: 0,
      entertainmentMinutes: 0,
      aiMinutes: 0,
      browserMinutes: 0,
      otherMinutes: 0,
      unlocks: null,
    };
  }

  return {
    status: 'available' as ContextStatus,
    source: 'phone_usage_daily' as const,
    totalMinutes: phoneUsage.total_minutes,
    lateNightMinutes: safeLateNightMinutes,
    formattedTotal: formatPhoneUsageDuration(phoneUsage.total_minutes),
    lateNightImpact,
    cognitiveProfile,
    categoryMinutesComplete: [phoneUsage.social_minutes, phoneUsage.messaging_minutes,
      phoneUsage.entertainment_minutes, phoneUsage.ai_minutes, phoneUsage.browser_minutes]
      .every((minutes) => typeof minutes === 'number'
        && Number.isFinite(minutes) && minutes >= 0),
    topApps,
    socialMinutes: phoneUsage.social_minutes ?? 0,
    messagingMinutes: phoneUsage.messaging_minutes ?? 0,
    entertainmentMinutes: phoneUsage.entertainment_minutes ?? 0,
    aiMinutes: phoneUsage.ai_minutes ?? 0,
    browserMinutes: phoneUsage.browser_minutes ?? 0,
    otherMinutes: phoneUsage.other_minutes ?? 0,
    unlocks: phoneUsage.unlocks ?? null,
  };
}

function resolveCaffeineInsights(
  caffeineEntries: Array<FoodEntryInput & { caffeineMg: number }>,
  lastCaffeine: (FoodEntryInput & { caffeineMg: number }) | undefined,
  bedtimeMs: number | null,
) {
  if (!lastCaffeine) {
    return {
      status: 'unavailable' as ContextStatus,
      source: 'daily_food_entries' as const,
      amountMg: null,
      lastAt: null,
      hoursBeforeBedtime: null,
      remainingMgAtBedtime: null,
      halfLifeHours: 5.5,
      isEstimate: true as const,
      estimateNotice: null,
    };
  }

  let caffeineHoursBeforeBedtime: number | null = null;
  let remainingCaffeineMgAtBedtime: number | null = null;

  if (lastCaffeine.logged_at && bedtimeMs != null) {
    const lastCaffMs = new Date(lastCaffeine.logged_at).getTime();
    if (!Number.isNaN(lastCaffMs)) {
      const diffH = (bedtimeMs - lastCaffMs) / 3600000;
      caffeineHoursBeforeBedtime = diffH > 0 ? Math.round(diffH * 10) / 10 : 0;
    }
  }

  const allDoseTimesKnown = caffeineEntries.every((entry) =>
    entry.logged_at != null && Number.isFinite(Date.parse(entry.logged_at)));
  if (caffeineEntries.length > 0 && bedtimeMs != null && allDoseTimesKnown) {
    let decayedSum = 0;
    for (const entry of caffeineEntries) {
      if (!entry.logged_at) continue;
      const entryMs = new Date(entry.logged_at).getTime();
      if (Number.isNaN(entryMs)) continue;
      const hoursElapsed = (bedtimeMs - entryMs) / 3600000;
      if (hoursElapsed >= 0 && hoursElapsed <= 24) {
        decayedSum += entry.caffeineMg * Math.pow(0.5, hoursElapsed / 5.5);
      }
    }
    remainingCaffeineMgAtBedtime = Math.round(decayedSum);
  }

  return {
    status: 'available' as ContextStatus,
    source: 'daily_food_entries' as const,
    amountMg: caffeineEntries.reduce((sum, entry) => sum + entry.caffeineMg, 0),
    lastAt: formatTimestamp(lastCaffeine.logged_at),
    hoursBeforeBedtime: caffeineHoursBeforeBedtime,
    remainingMgAtBedtime: remainingCaffeineMgAtBedtime,
    halfLifeHours: 5.5,
    isEstimate: true as const,
    estimateNotice: 'Szacunek z wpisów jedzenia (model half-life ~5.5h). Brak pomiaru stężenia we krwi.',
  };
}

function resolveMealsInsights(
  foodEntries: FoodEntryInput[],
  lastMeal: FoodEntryInput | undefined,
  measuredQuality: number[],
  bedtimeMs: number | null,
) {
  if (foodEntries.length === 0) {
    return {
      status: 'unavailable' as ContextStatus,
      source: 'daily_food_entries' as const,
      calories: null,
      lastAt: null,
      hoursBeforeBedtime: null,
      averageQuality: null,
    };
  }

  let mealHoursBeforeBedtime: number | null = null;
  if (lastMeal?.logged_at && bedtimeMs != null) {
    const lastMealMs = new Date(lastMeal.logged_at).getTime();
    if (!Number.isNaN(lastMealMs)) {
      const diffH = (bedtimeMs - lastMealMs) / 3600000;
      mealHoursBeforeBedtime = diffH > 0 ? Math.round(diffH * 10) / 10 : 0;
    }
  }

  return {
    status: 'available' as ContextStatus,
    source: 'daily_food_entries' as const,
    calories: foodEntries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0),
    lastAt: formatTimestamp(lastMeal?.logged_at ?? null),
    hoursBeforeBedtime: mealHoursBeforeBedtime,
    averageQuality: measuredQuality.length > 0
      ? Math.round(measuredQuality.reduce((sum, score) => sum + score, 0) / measuredQuality.length)
      : null,
  };
}

function resolveTrainingInsights(workouts: WorkoutInput[]) {
  if (workouts.length === 0) {
    return {
      status: 'unavailable' as ContextStatus,
      source: 'workout_sessions' as const,
      durationMinutes: null,
      strainScore: null,
      lastEndTime: null,
    };
  }

  const durationMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes ?? 0), 0);
  const strainScores = workouts.flatMap((w) => w.hr_strain_score == null ? [] : [w.hr_strain_score]);

  return {
    status: 'available' as ContextStatus,
    source: 'workout_sessions' as const,
    durationMinutes,
    strainScore: strainScores.length > 0 ? Math.max(...strainScores) : null,
    lastEndTime: workouts.at(-1)?.end_time ?? null,
  };
}

export function buildOuraContextInsights(input: OuraContextInput) {
  const bedtimeDate = input.bedtimeStart ? new Date(input.bedtimeStart) : null;
  const bedtimeMs = bedtimeDate && !Number.isNaN(bedtimeDate.getTime()) ? bedtimeDate.getTime() : null;
  const caffeineEntries = input.foodEntries
    .map((entry) => ({ ...entry, caffeineMg: estimateCaffeineMg(entry.name) }))
    .filter((entry) => entry.caffeineMg > 0)
    .filter((entry) => bedtimeMs == null || !entry.logged_at
      || !Number.isFinite(Date.parse(entry.logged_at)) || Date.parse(entry.logged_at) <= bedtimeMs)
    .sort((left, right) => (left.logged_at ?? '').localeCompare(right.logged_at ?? ''));
  const foodWithTimestamps = input.foodEntries
    .filter((entry) => entry.logged_at && Number.isFinite(Date.parse(entry.logged_at))
      && (bedtimeMs == null || Date.parse(entry.logged_at) <= bedtimeMs))
    .sort((left, right) => (left.logged_at ?? '').localeCompare(right.logged_at ?? ''));
  const measuredQuality = input.foodEntries
    .flatMap((entry) => entry.food_quality_score == null ? [] : [entry.food_quality_score]);
  const lastCaffeine = caffeineEntries.at(-1);
  const lastMeal = foodWithTimestamps.at(-1);

  return {
    date: input.sleepDate,
    bedtimeStart: input.bedtimeStart,
    screen: resolveScreenInsights(input.phoneUsage),
    caffeine: resolveCaffeineInsights(caffeineEntries, lastCaffeine, bedtimeMs),
    meals: resolveMealsInsights(input.foodEntries, lastMeal, measuredQuality, bedtimeMs),
    training: resolveTrainingInsights(input.workouts),
  };
}

export type OuraContextInsights = ReturnType<typeof buildOuraContextInsights> & {
  sourceErrors?: Array<{ source: string; message: string }>;
};
