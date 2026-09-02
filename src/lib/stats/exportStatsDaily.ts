import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Tables } from '../database.types';
import { getDistance } from './exportStatsHelpers';
import {
  renderOuraSection,
  renderPhoneSection,
  renderAwSection,
  renderNutritionSection,
} from './exportStatsSections';
import { renderStravaSection } from './exportStatsStrava';
import { renderWorkoutSessions } from './exportStatsWorkout';
import { renderJournalAndHabits } from './exportStatsJournal';
import type {
  AwAppEntry,
  PhoneTopApp,
  StravaCleanActivity,
} from './exportStatsTypes';
import type { ExportData } from './exportStatsFetch';

interface RenderDailyParams {
  dateStr: string;
  d: ExportData;
  flags: {
    includeNutrition: boolean;
    includeJournal: boolean;
    includeOura: boolean;
    includeHabits: boolean;
    includeWorkouts: boolean;
    includeBody: boolean;
    includeActivityWatch: boolean;
  };
  userPOI: { name: string; lat: number | null | undefined; lng: number | null | undefined; radius: number }[];
  stravaCommentById: Map<string, string>;
  toWarsawDate: (iso: string | number | Date) => string;
}

function wrapSection(title: string, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';
  return `### ${title}\n\n${trimmed}\n`;
}

function renderBodyMetrics(dayBody: Tables<'body_metrics'>): string {
  let output = `#### ⚖️ Pomiary ciała\n`;
  if (dayBody.weight) output += `- **Waga:** ${dayBody.weight} kg\n`;
  if (dayBody.waist) output += `- **Talia:** ${dayBody.waist} cm\n`;

  const extraMetrics = {
    neck: 'Szyja',
    chest: 'Klatka',
    hips: 'Biodra',
    belly: 'Brzuch',
    biceps_l: 'Biceps (L)',
    biceps_r: 'Biceps (P)',
    forearm: 'Przedramię',
    thigh: 'Udo',
    calf: 'Łydka',
  };
  Object.entries(extraMetrics).forEach(([key, label]) => {
    if ((dayBody as Record<string, unknown>)[key]) {
      output += `- **${label}:** ${(dayBody as Record<string, unknown>)[key]} cm\n`;
    }
  });
  output += `\n`;
  return output;
}

function renderDaySnapshot({
  dayOura,
  dayJournal,
  daySessions,
  dayStrava,
  dayFood,
  dayNutrition,
}: {
  dayOura: Tables<'oura_daily_summary'> | null | undefined;
  dayJournal: Tables<'daily_wins'> | undefined;
  daySessions: Tables<'workout_sessions'>[];
  dayStrava: StravaCleanActivity[];
  dayFood: Tables<'daily_food_entries'>[];
  dayNutrition: Tables<'daily_nutrition'> | undefined;
}): string {
  const chips: string[] = [];

  if (dayOura?.readiness_score) chips.push(`Readiness **${dayOura.readiness_score}**`);
  if (dayOura?.total_sleep_hours) chips.push(`Sen **${dayOura.total_sleep_hours}h**`);
  if (dayOura?.steps) chips.push(`Kroki **${dayOura.steps.toLocaleString('pl-PL')}**`);
  if (daySessions.length > 0) chips.push(`Siłownia **✓**`);
  if (dayStrava.length > 0) chips.push(`Kardio **${dayStrava.length}×**`);

  const dayCalories = dayFood.length > 0
    ? dayFood.reduce((sum, f) => sum + (f.calories || 0), 0)
    : dayNutrition?.calories;
  if (dayCalories && dayCalories > 0) chips.push(`**${Math.round(dayCalories)}** kcal`);

  if (dayJournal) {
    chips.push(dayJournal.result === 'Z' ? 'Dzień **WYGRANY**' : 'Dzień **przegrany**');
  }

  if (chips.length === 0) return '';
  return `> ${chips.join(' · ')}\n\n`;
}

/* eslint-disable max-lines-per-function -- dense daily markdown template */
export function renderDailySummaryMarkdown({
  dateStr,
  d,
  flags,
  userPOI,
  stravaCommentById,
  toWarsawDate,
}: RenderDailyParams): string {
  const {
    sessions,
    bodyMetrics,
    food: foodEntries,
    foodError,
    nutritionSummary: nutritionEntries,
    journal: journalEntries,
    telegramLogs: telegramEntries,
    habits,
    habitLogs,
    ouraData,
    ouraEnhanced,
    ouraDerived,
    photos,
    locationHistory,
    stravaData,
    phoneUsageData,
  } = d;

  const {
    includeNutrition,
    includeJournal,
    includeOura,
    includeHabits,
    includeWorkouts,
    includeBody,
    includeActivityWatch,
  } = flags;

  const daySessions = (sessions ?? []).filter((s: Tables<'workout_sessions'>) => {
    if (s.date === dateStr) return true;
    if (s.start_time && toWarsawDate(s.start_time) === dateStr) return true;
    return false;
  });
  const dayFood = foodEntries.filter((f: Tables<'daily_food_entries'>) => f.date === dateStr);
  const dayNutrition = nutritionEntries.find((n: Tables<'daily_nutrition'>) => n.date === dateStr);
  const dayJournal = journalEntries.find((j: Tables<'daily_wins'>) => j.date === dateStr);
  const seenContent = new Set<string>();
  const dayTelegramLogs = telegramEntries
    .filter((t: ExportData['telegramLogs'][number]) => t.created_at && toWarsawDate(t.created_at) === dateStr)
    .filter((t: ExportData['telegramLogs'][number]) => (t.metadata as Record<string, unknown>)?.mode === 'stream')
    .filter((t: ExportData['telegramLogs'][number]) => {
      const key = (t.content || '').trim();
      if (seenContent.has(key)) return false;
      seenContent.add(key);
      return true;
    });
  const dayBody = (bodyMetrics ?? []).find((b: Tables<'body_metrics'>) => b.date === dateStr);
  const dayOura = (ouraData ?? [])?.find((o: Tables<'oura_daily_summary'>) => o.date === dateStr);
  const dayOuraEnhanced = (ouraEnhanced ?? []).find((o: Tables<'oura_enhanced'>) => o.date === dateStr);
  const dayOuraDerived = (ouraDerived ?? []).find((o: ExportData['ouraDerived'][number]) => o.day === dateStr);
  const dayPhotos = (photos ?? [])?.filter((p: Tables<'progress_photos'>) => p.date === dateStr);
  const dayStrava = ((stravaData ?? []) as StravaCleanActivity[]).filter((a) => {
    if (!a.start_date) return false;
    return toWarsawDate(a.start_date) === dateStr;
  });
  const dayPhone = (phoneUsageData ?? []).find((p: Tables<'phone_usage_daily'>) => p.date === dateStr);
  const dayAw = includeActivityWatch
    ? (d.awSummary ?? []).find((a: Tables<'aw_daily_summary'>) => a.date === dateStr)
    : null;

  const hasAnyData =
    (includeWorkouts && (daySessions.length > 0 || dayStrava.length > 0)) ||
    (includeNutrition && (dayFood.length > 0 || dayNutrition)) ||
    (includeJournal && (dayJournal || dayTelegramLogs.length > 0)) ||
    (includeBody && dayBody) ||
    (includeOura && dayOura) ||
    dayPhotos?.length > 0 ||
    !!dayAw ||
    !!dayPhone;

  const dayTitle = format(parseISO(dateStr), 'd MMMM yyyy (EEEE)', { locale: pl });

  if (!hasAnyData) {
    return `## ${dayTitle}\n### ❌ Brak danych\n*Dzień bez wpisów w wybranych kategoriach.*\n\n---\n\n`;
  }

  let md = `## ${dayTitle}\n\n`;
  md += renderDaySnapshot({
    dayOura,
    dayJournal,
    daySessions,
    dayStrava,
    dayFood,
    dayNutrition,
  });

  let bioSection = '';
  if (flags.includeOura && dayOura) {
    bioSection += renderOuraSection({ dayOura, dayOuraEnhanced, dayOuraDerived });
  }
  if (flags.includeBody && dayBody) {
    bioSection += renderBodyMetrics(dayBody);
  }
  if (dayPhotos && dayPhotos.length > 0) {
    bioSection += `#### 📸 Zdjęcia postępu\n`;
    dayPhotos.forEach((p: Tables<'progress_photos'>, idx: number) => {
      bioSection += `![Zdjęcie ${idx + 1}](${p.image_url})\n`;
    });
    bioSection += `\n`;
  }
  md += wrapSection('☀️ Regeneracja i ciało', bioSection);

  let digitalSection = '';
  if (dayPhone) {
    digitalSection += renderPhoneSection({
      dayPhone: {
        ...dayPhone,
        top_apps: dayPhone.top_apps as PhoneTopApp[] | null,
      },
    });
  }
  if (dayAw) {
    digitalSection += renderAwSection({
      dayAw: {
        ...dayAw,
        top_apps: dayAw.top_apps as AwAppEntry[] | null,
        web_domains: dayAw.web_domains as AwAppEntry[] | null,
      },
    });
  }
  md += wrapSection('📱 Ekran i produktywność', digitalSection);

  const dayLocations = locationHistory?.filter(
    (l: Tables<'location_history'>) => l.created_at && toWarsawDate(l.created_at) === dateStr
  );
  const visitedPOIs = userPOI.filter((poi) =>
    dayLocations?.some(
      (loc: Tables<'location_history'>) =>
        getDistance(loc.latitude, loc.longitude, poi.lat!, poi.lng!) < poi.radius
    )
  );
  const detectedPlaces = [
    ...new Set(dayLocations?.filter((l: Tables<'location_history'>) => l.place_name).map((l: Tables<'location_history'>) => l.place_name)),
  ];
  if (visitedPOIs.length > 0 || detectedPlaces.length > 0) {
    let locSection = `#### 📍 Lokalizacje\n`;
    visitedPOIs.forEach((poi) => {
      locSection += `- ✅ **${poi.name}**\n`;
    });
    detectedPlaces.forEach((place) => {
      if (!visitedPOIs.some((p) => p.name === place)) {
        locSection += `- 🤖 ${place}\n`;
      }
    });
    locSection += `\n`;
    md += wrapSection('📍 Kontekst miejsca', locSection);
  }

  let activitySection = '';
  if (includeWorkouts) {
    activitySection += renderWorkoutSessions(daySessions);
  }
  if (includeWorkouts && dayStrava.length > 0) {
    activitySection = renderStravaSection({
      md: activitySection,
      dayStrava,
      stravaCommentById,
      ouraData: ouraData ?? [],
      ouraEnhanced: ouraEnhanced ?? [],
      toWarsawDate,
    });
  }
  md += wrapSection('🏃 Aktywność', activitySection);

  if (includeNutrition) {
    const nutritionBlock = renderNutritionSection({
      dayFood,
      dayNutrition,
      foodError,
      _dayStrava: dayStrava,
    });
    md += wrapSection('🍽️ Odżywianie', nutritionBlock);
  }

  md += renderJournalAndHabits({
    dayJournal,
    dayTelegramLogs: dayTelegramLogs as Tables<'vanguard_stream'>[],
    dayHabitLogs: (habitLogs ?? []).filter((l: Tables<'habit_logs'>) => l.date === dateStr),
    habits,
    includeJournal,
    includeHabits,
  });

  md += `---\n\n`;
  return md;
}
