import {
  evaluateCognitiveProfile,
  evaluateLateNightImpact,
  formatPhoneUsageDuration,
  type LateNightImpact,
  type PhoneCognitiveProfile,
} from '@vanguard/domain';

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
  timeZone: 'Europe/Warsaw',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatTimestamp(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : WARSAW_TIME.format(date);
}

function estimateCaffeine(name: string): number {
  const lower = name.toLowerCase();
  const explicit = lower.match(/(\d{1,4})\s*mg/);
  if (explicit) return Number(explicit[1]);
  if (lower.includes('espresso')) return 63;
  if (lower.includes('kawa') || lower.includes('coffee')) return 95;
  if (lower.includes('matcha')) return 30;
  if (lower.includes('herbata') || lower.includes('tea')) return 47;
  if (lower.includes('energy drink')) return 80;
  return 0;
}

export function buildOuraContextInsights(input: OuraContextInput) {
  const caffeineEntries = input.foodEntries
    .map((entry) => ({ ...entry, caffeineMg: estimateCaffeine(entry.name) }))
    .filter((entry) => entry.caffeineMg > 0)
    .sort((left, right) => (left.logged_at ?? '').localeCompare(right.logged_at ?? ''));
  const foodWithTimestamps = input.foodEntries
    .filter((entry) => entry.logged_at)
    .sort((left, right) => (left.logged_at ?? '').localeCompare(right.logged_at ?? ''));
  const measuredQuality = input.foodEntries
    .flatMap((entry) => entry.food_quality_score == null ? [] : [entry.food_quality_score]);
  const lastCaffeine = caffeineEntries.at(-1);
  const lastMeal = foodWithTimestamps.at(-1);
  const durationMinutes = input.workouts.reduce(
    (sum, workout) => sum + (workout.duration_minutes ?? 0),
    0,
  );
  const strainScores = input.workouts.flatMap(
    (workout) => workout.hr_strain_score == null ? [] : [workout.hr_strain_score],
  );

  const phoneUsage = input.phoneUsage;
  const lateNightImpact: LateNightImpact | null = phoneUsage
    ? evaluateLateNightImpact(phoneUsage.late_night_minutes)
    : null;
  const cognitiveProfile: PhoneCognitiveProfile | null = phoneUsage
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

  return {
    date: input.sleepDate,
    bedtimeStart: input.bedtimeStart,
    screen: phoneUsage ? {
      status: 'available' as ContextStatus,
      source: 'phone_usage_daily' as const,
      totalMinutes: phoneUsage.total_minutes,
      lateNightMinutes: phoneUsage.late_night_minutes,
      formattedTotal: formatPhoneUsageDuration(phoneUsage.total_minutes),
      lateNightImpact,
      cognitiveProfile,
      topApps,
      socialMinutes: phoneUsage.social_minutes ?? 0,
      messagingMinutes: phoneUsage.messaging_minutes ?? 0,
      entertainmentMinutes: phoneUsage.entertainment_minutes ?? 0,
      aiMinutes: phoneUsage.ai_minutes ?? 0,
      browserMinutes: phoneUsage.browser_minutes ?? 0,
      otherMinutes: phoneUsage.other_minutes ?? 0,
      unlocks: phoneUsage.unlocks ?? null,
    } : {
      status: 'unavailable' as ContextStatus,
      source: 'phone_usage_daily' as const,
      totalMinutes: null,
      lateNightMinutes: null,
      formattedTotal: null,
      lateNightImpact: null,
      cognitiveProfile: null,
      topApps: [],
      socialMinutes: 0,
      messagingMinutes: 0,
      entertainmentMinutes: 0,
      aiMinutes: 0,
      browserMinutes: 0,
      otherMinutes: 0,
      unlocks: null,
    },
    caffeine: lastCaffeine ? {
      status: 'available' as ContextStatus,
      source: 'daily_food_entries' as const,
      amountMg: caffeineEntries.reduce((sum, entry) => sum + entry.caffeineMg, 0),
      lastAt: formatTimestamp(lastCaffeine.logged_at),
    } : {
      status: 'unavailable' as ContextStatus,
      source: 'daily_food_entries' as const,
      amountMg: null,
      lastAt: null,
    },
    meals: input.foodEntries.length > 0 ? {
      status: 'available' as ContextStatus,
      source: 'daily_food_entries' as const,
      calories: input.foodEntries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0),
      lastAt: formatTimestamp(lastMeal?.logged_at ?? null),
      averageQuality: measuredQuality.length > 0
        ? Math.round(measuredQuality.reduce((sum, score) => sum + score, 0) / measuredQuality.length)
        : null,
    } : {
      status: 'unavailable' as ContextStatus,
      source: 'daily_food_entries' as const,
      calories: null,
      lastAt: null,
      averageQuality: null,
    },
    training: input.workouts.length > 0 ? {
      status: 'available' as ContextStatus,
      source: 'workout_sessions' as const,
      durationMinutes,
      strainScore: strainScores.length > 0 ? Math.max(...strainScores) : null,
      lastEndTime: input.workouts.at(-1)?.end_time ?? null,
    } : {
      status: 'unavailable' as ContextStatus,
      source: 'workout_sessions' as const,
      durationMinutes: null,
      strainScore: null,
      lastEndTime: null,
    },
  };
}

export type OuraContextInsights = ReturnType<typeof buildOuraContextInsights>;
