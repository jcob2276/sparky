import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Tables } from '../database.types';
import { formatWarsawDate, shiftDateStr } from '../date';
import type { ExportStatsMarkdownParams, StravaRawActivity } from './exportStatsTypes';
import { downloadBlob, getAvg } from './exportStatsHelpers';
import { fetchExportData } from './exportStatsFetch';
import { renderDailySummaryMarkdown } from './exportStatsDaily';
import { supabase as defaultSupabase } from '../supabase';

export type { ExportStatsMarkdownParams } from './exportStatsTypes';
export { exportOuraCsv } from './exportOuraCsv';

export async function exportStatsMarkdown({
  supabase = defaultSupabase,
  session,
  dateRange,
  userSettings,
  includeNutrition,
  includeJournal,
  includeOura,
  includeHabits,
  includeWorkouts,
  includeBody,
  includeActivityWatch,
  includeLenie = true,
  includeFundament = true,
}: ExportStatsMarkdownParams) {
  const d = await fetchExportData(supabase, session, dateRange, {
    includeNutrition,
    includeJournal,
    includeOura,
    includeHabits: includeHabits || includeLenie,
    includeWorkouts,
    includeBody,
    includeActivityWatch,
  });

  const {
    sessions,
    bodyMetrics,
    nutritionSummary: nutritionEntries,
    reviews: weeklyReviews,
    goals: goalsRow,
    fundament,
    stravaRawData,
  } = d;

  const stravaCommentById = new Map(
    (stravaRawData as StravaRawActivity[])
      .map((a) => [
        String(a.strava_id),
        (a.raw_data?.description || a.raw_data?.athlete_comment || '').trim(),
      ] as [string, string])
      .filter(([, comment]) => comment)
  );

  const toWarsawDate = formatWarsawDate;

  const userPOI = [
    { name: 'Dom', lat: userSettings?.home_lat, lng: userSettings?.home_lng, radius: 150 },
    { name: 'Rzeszów', lat: 50.0413, lng: 21.9990, radius: 5000 },
  ].filter((p) => p.lat && p.lng);

  let md = '';
  if (includeFundament) {
    md += `# ROZDZIAŁ 0: FUNDAMENT TOŻSAMOŚCI I WIZJA\n\n`;
    const fundRow = (fundament ?? null) as Tables<'user_fundament'> | null;
    if (fundRow) {
      md += `## 1. TOŻSAMOŚĆ\n${fundRow.identity || 'Brak wpisów.'}\n\n`;
      md += `## 2. WARTOŚCI I FILOZOFIA\n${fundRow.philosophy || 'Brak wpisów.'}\n\n`;
      md += `## 3. WIZJA\n${fundRow.vision || 'Brak wpisów.'}\n\n`;
      md += `## 4. PRACA I FINANSE\n${fundRow.finances || 'Brak wpisów.'}\n\n`;
      md += `## 5. WIEDZA\n${fundRow.knowledge || 'Brak wpisów.'}\n\n`;
      md += `## 6. RELACJE\n${fundRow.relationships || 'Brak wpisów.'}\n\n`;
    }
    md += `---\n\n`;
  }

  md += `# RAPORT ZINTEGROWANY SPARKY OS\n`;
  md += `Okres: **${dateRange.from}** do **${dateRange.to}**\n\n`;

  const avgWeight = getAvg(bodyMetrics as Record<string, unknown>[] | null, 'weight', 2);
  const avgWaist = getAvg(bodyMetrics as Record<string, unknown>[] | null, 'waist', 1);
  const avgCalories = getAvg(nutritionEntries as Record<string, unknown>[], 'calories');
  const avgProtein = getAvg(nutritionEntries as Record<string, unknown>[], 'protein');
  const avgSteps = getAvg(d.ouraData as Record<string, unknown>[] | null, 'steps');
  const avgSleep = getAvg(d.ouraData as Record<string, unknown>[] | null, 'total_sleep_hours', 2);
  const avgReadiness = getAvg(d.ouraData as Record<string, unknown>[] | null, 'readiness_score');
  const avgHrv = getAvg(d.ouraEnhanced as Record<string, unknown>[] | null, 'sleep_average_hrv', 1);
  const avgRhr = getAvg(d.ouraEnhanced as Record<string, unknown>[] | null, 'sleep_lowest_heart_rate', 1);

  const stravaActivities = (d.stravaData ?? []).filter((a) => !a.is_oura);
  const totalCardioKm = Math.round(
    stravaActivities.reduce((acc, a) => acc + (Number(a.distance) || 0) / 1000, 0) * 10
  ) / 10;
  const totalLiftVolume = (sessions ?? []).reduce((acc, session) => {
    const logs = (session as Tables<'workout_sessions'> & { exercise_logs?: Tables<'exercise_logs'>[] }).exercise_logs ?? [];
    return acc + logs.reduce((sum, log) => sum + (Number(log.weight) || 0) * (Number(log.reps) || 0), 0);
  }, 0);
  const disciplineDays = (d.ouraData ?? []).filter((o) => o.is_disciplined).length;
  const ouraDays = (d.ouraData ?? []).length;
  const journalWins = (d.journal ?? []).filter((j) => j.result === 'Z').length;
  const journalDays = (d.journal ?? []).length;

  const avgPhoneMinutes = getAvg(d.phoneUsageData as Record<string, unknown>[] | null, 'total_minutes');
  const avgLateNight = getAvg(d.phoneUsageData as Record<string, unknown>[] | null, 'late_night_minutes');
  const relapses = (d.habitLogs ?? []).filter((l) => {
    const h = (d.habits ?? []).find((x) => x.id === l.habit_id);
    return h && !h.is_positive;
  });

  md += `## 📊 PODSUMOWANIE OKRESU (EXECUTIVE DASHBOARD)\n\n`;
  md += `| Domena | Metryka | Wartość |\n`;
  md += `| :--- | :--- | :--- |\n`;
  if (includeBody) {
    md += `| **Ciało** | Średnia waga | ${avgWeight} kg |\n`;
    md += `| **Ciało** | Średnia talia | ${avgWaist} cm |\n`;
  }
  if (includeNutrition) {
    md += `| **Dieta** | Średnie kalorie | ${avgCalories} kcal |\n`;
    md += `| **Dieta** | Średnie białko | ${avgProtein} g |\n`;
  }
  if (includeWorkouts) {
    md += `| **Trening** | Sesje siłowe | ${(sessions ?? []).length} |\n`;
    md += `| **Trening** | Tonaż łączny | ${totalLiftVolume > 0 ? `${Math.round(totalLiftVolume).toLocaleString('pl-PL')} kg` : '—'} |\n`;
    md += `| **Kardio** | Aktywności bieg/kardio | ${stravaActivities.length} |\n`;
    md += `| **Kardio** | Dystans łączny | ${totalCardioKm > 0 ? `${totalCardioKm} km` : '—'} |\n`;
  }
  if (includeOura) {
    md += `| **Regeneracja** | Średni sen | ${avgSleep} h |\n`;
    md += `| **Regeneracja** | Średni Readiness Oura | ${avgReadiness} |\n`;
    md += `| **Regeneracja** | Średnie HRV / RHR | ${avgHrv} ms / ${avgRhr} bpm |\n`;
    md += `| **Regeneracja** | Średnie kroki | ${avgSteps} |\n`;
  }
  if (includeActivityWatch) {
    md += `| **Ekran** | Średni czas telefonu | ${avgPhoneMinutes} min/dzień |\n`;
    md += `| **Ekran** | Nocny ekran po 22:00 | ${avgLateNight} min/dzień |\n`;
  }
  if (includeHabits || includeLenie) {
    md += `| **Dyscyplina** | Incydenty (Lenie) | ${relapses.length} |\n`;
    md += `| **Dyscyplina** | Czyste dni Oura | ${ouraDays > 0 ? `${disciplineDays}/${ouraDays} (${Math.round((disciplineDays / ouraDays) * 100)}%)` : '—'} |\n`;
  }
  if (includeJournal) {
    md += `| **Mental** | Wygrane dni (Plan) | ${journalDays > 0 ? `${journalWins}/${journalDays} (${Math.round((journalWins / journalDays) * 100)}%)` : '—'} |\n`;
  }
  md += `\n`;

  if (includeFundament && goalsRow) {
    md += `## 🎯 TWOJE CELE (KONTEKST)\n`;
    md += `- **Ciało:** ${goalsRow.goal_cialo}\n`;
    md += `- **Duch:** ${goalsRow.goal_duch}\n`;
    md += `- **Konto:** ${goalsRow.goal_konto}\n\n`;
  }

  // Generate full date range to detect missing days
  const allDatesInRange: string[] = [];
  let current = parseISO(dateRange.from);
  const end = parseISO(dateRange.to);
  while (current <= end) {
    allDatesInRange.push(format(current, 'yyyy-MM-dd'));
    current = new Date(shiftDateStr(format(current, 'yyyy-MM-dd'), 1) + 'T12:00:00Z');
  }

  md += `## 📅 Spis dni\n`;
  allDatesInRange.forEach((dateStr, idx) => {
    const label = format(parseISO(dateStr), 'd MMMM yyyy (EEEE)', { locale: pl });
    md += `${idx + 1}. ${label}\n`;
  });
  md += `\n---\n\n# DZIENNIK DNI\n\n`;

  allDatesInRange.forEach((dateStr) => {
    md += renderDailySummaryMarkdown({
      dateStr,
      d,
      flags: {
        includeNutrition,
        includeJournal,
        includeOura,
        includeHabits,
        includeWorkouts,
        includeBody,
        includeActivityWatch,
      },
      userPOI,
      stravaCommentById,
      toWarsawDate,
    });
  });

  const validWeeklyReviews = weeklyReviews.filter((r) => r.proud_of || r.sabotage || r.do_differently);
  if (validWeeklyReviews.length > 0) {
    md += `# 📑 PRZEGLĄDY TYGODNIA\n\n`;
    validWeeklyReviews.forEach((r) => {
      md += `## Tydzień od ${r.week_start}\n`;
      if (r.proud_of) md += `**Duma:** ${r.proud_of}\n`;
      if (r.sabotage) md += `**Sabotaż:** ${r.sabotage}\n`;
      if (r.do_differently) md += `**Inaczej:** ${r.do_differently}\n`;
      md += `\n`;
    });
  }

  const blob = new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `raport_kuba_${dateRange.from}.md`);
}
