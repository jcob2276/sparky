import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Tables } from '../database.types';
import { formatWarsawDate, shiftDateStr } from '../date';
import type { ExportStatsMarkdownParams, StravaRawActivity } from './exportStatsTypes';
import { downloadBlob, getAvg } from './exportStatsHelpers';
import { fetchExportData } from './exportStatsFetch';
import { renderDailySummaryMarkdown } from './exportStatsDaily';

export type { ExportStatsMarkdownParams } from './exportStatsTypes';
export { exportOuraCsv } from './exportOuraCsv';

export async function exportStatsMarkdown({
  supabase,
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
}: ExportStatsMarkdownParams) {
  const d = await fetchExportData(supabase, session, dateRange, {
    includeNutrition,
    includeJournal,
    includeOura,
    includeHabits,
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

  let md = `# ROZDZIAŁ 0: FUNDAMENT TOŻSAMOŚCI I WIZJA\n\n`;
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
  md += `# RAPORT TRENINGOWY I LIFESTYLE\n`;
  md += `Okres: ${dateRange.from} do ${dateRange.to}\n\n`;

  const avgWeight = getAvg(bodyMetrics as Record<string, unknown>[] | null, 'weight', 2);
  const avgWaist = getAvg(bodyMetrics as Record<string, unknown>[] | null, 'waist', 1);
  const avgCalories = getAvg(nutritionEntries as Record<string, unknown>[], 'calories');
  const avgProtein = getAvg(nutritionEntries as Record<string, unknown>[], 'protein');
  const avgSteps = getAvg(d.ouraData as Record<string, unknown>[] | null, 'steps');
  const avgSleep = getAvg(d.ouraData as Record<string, unknown>[] | null, 'total_sleep_hours', 2);
  const avgReadiness = getAvg(d.ouraData as Record<string, unknown>[] | null, 'readiness_score');

  const stravaActivities = (d.stravaData ?? []).filter((a) => !a.is_oura);
  const totalLiftVolume = (sessions ?? []).reduce((acc, session) => {
    const logs = (session as Tables<'workout_sessions'> & { exercise_logs?: Tables<'exercise_logs'>[] }).exercise_logs ?? [];
    return acc + logs.reduce((sum, log) => sum + (Number(log.weight) || 0) * (Number(log.reps) || 0), 0);
  }, 0);
  const disciplineDays = (d.ouraData ?? []).filter((o) => o.is_disciplined).length;
  const ouraDays = (d.ouraData ?? []).length;
  const journalWins = (d.journal ?? []).filter((j) => j.result === 'Z').length;
  const journalDays = (d.journal ?? []).length;

  md += `## 📊 PODSUMOWANIE OKRESU\n\n`;
  md += `| Metryka | Wartość |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Średnia waga** | ${avgWeight} kg |\n`;
  md += `| **Średnia talia** | ${avgWaist} cm |\n`;
  md += `| **Średnie kcal** | ${avgCalories} kcal |\n`;
  md += `| **Średnie białko** | ${avgProtein} g |\n`;
  md += `| **Treningi siłowe** | ${(sessions ?? []).length} |\n`;
  md += `| **Objętość siłowa (łącznie)** | ${totalLiftVolume > 0 ? `${Math.round(totalLiftVolume).toLocaleString('pl-PL')} kg` : '—'} |\n`;
  md += `| **Aktywności cardio** | ${stravaActivities.length} |\n`;
  md += `| **Średnie kroki** | ${avgSteps} |\n`;
  md += `| **Średni sen** | ${avgSleep} h |\n`;
  md += `| **Średni Readiness** | ${avgReadiness} |\n`;
  md += `| **Dyscyplina (Oura)** | ${ouraDays > 0 ? `${disciplineDays}/${ouraDays} dni` : '—'} |\n`;
  md += `| **Wygrane dni (plan)** | ${journalDays > 0 ? `${journalWins}/${journalDays}` : '—'} |\n\n`;

  if (goalsRow) {
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

  if (weeklyReviews.length > 0) {
    md += `# 📑 PRZEGLĄDY TYGODNIA\n\n`;
    weeklyReviews.forEach((r) => {
      md += `## Tydzień od ${r.week_start}\n`;
      md += `**Duma:** ${r.proud_of}\n`;
      md += `**Sabotaż:** ${r.sabotage}\n`;
      md += `**Inaczej:** ${r.do_differently}\n\n`;
    });
  }

  const blob = new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `raport_kuba_${dateRange.from}.md`);
}
