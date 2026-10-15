import { Moon, Activity } from 'lucide-react';
import type { OuraHealthHubData } from './types';
import { SleepFactorsSection } from './SleepFactorsSection';
import { SleepRecoveryArchitecture } from './SleepRecoveryArchitecture';
import { TargetStrainGaugeCard } from '../health/TargetStrainGaugeCard';
import { HabitImpactCard } from '../health/HabitImpactCard';
import { ThreeRingHeroCard } from '../health/ThreeRingHeroCard';
import { StressEnergyBankCard } from '../health/StressEnergyBankCard';
import { SleepNeedBreakdownCard } from '../health/SleepNeedBreakdownCard';
import { DayTimelineCard } from '../health/DayTimelineCard';
import { SleepDiagnosisCard } from './SleepDiagnosisCard';
import { SleepEveningActionCard } from './SleepEveningActionCard';
import { SleepConsistencyCard } from '../health/SleepConsistencyCard';
import { SleepBankCard } from '../health/SleepBankCard';
import { BedtimeTargetCard } from '../health/BedtimeTargetCard';
import { CaffeineCutoffCard } from '../health/CaffeineCutoffCard';
import {
  buildDayTimeline,
  calculateSleepConsistency,
  calculateSleepBank,
  calculateCaffeineCutoff,
  calculateDynamicFueling,
  type DailySleepRecord,
  type SleepBankDayInput,
} from '@vanguard/domain';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function getSleepDiagnosis(readinessScore: number) {
  if (readinessScore >= 80) {
    return {
      title: 'Wysoka regeneracja i gotowość',
      desc: 'Oura odnotowała wysoki wynik gotowości. To jeden sygnał; decyzja treningowa uwzględnia też plan, ból, chorobę i ostatnie wykonanie.',
      status: 'optimal' as const,
    };
  }
  const isModerate = readinessScore >= 65;
  return {
    title: isModerate ? 'Średnia regeneracja — umiarkowany wysiłek' : readinessScore > 0 ? 'Niższy wynik gotowości' : 'Brak aktualnego wyniku gotowości',
    desc: isModerate
      ? 'Wynik Oury znajduje się w środkowym zakresie. Sprawdź wspólną decyzję treningową i swoje odczucia przed sesją.'
      : 'Sam wskaźnik nie ustala przyczyny zmęczenia. Brak danych nie potwierdza gotowości do zwiększenia obciążenia.',
    status: isModerate ? ('moderate' as const) : ('low' as const),
  };
}

function formatTimeHHMM(isoOrTimeString?: string | null, fallback = '07:00'): string {
  if (!isoOrTimeString) return fallback;
  if (isoOrTimeString.includes('T')) {
    const d = new Date(isoOrTimeString);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  const match = isoOrTimeString.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDateOffset(baseDate: string, daysAgo: number): string {
  return shiftDateStr(baseDate, -daysAgo);
}

function buildDefaultSleepRecords(
  baseDate: string,
  bedtimeStart?: string | null,
  bedtimeEnd?: string | null
): DailySleepRecord[] {
  const offsets = [6, 5, 4, 3, 2, 1, 0];
  const defaults = [
    { bed: '23:10', wake: '07:05' },
    { bed: '23:05', wake: '07:10' },
    { bed: '23:45', wake: '07:50' },
    { bed: '23:30', wake: '07:40' },
    { bed: '23:15', wake: '07:05' },
    { bed: '23:00', wake: '06:55' },
    { bed: formatTimeHHMM(bedtimeStart, '23:10'), wake: formatTimeHHMM(bedtimeEnd, '07:00') },
  ];
  return offsets.map((ago, i) => {
    const date = getDateOffset(baseDate, ago);
    const d = new Date(`${date}T12:00:00`);
    const isFreeDay = !isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6);
    return { date, bedtime: defaults[i].bed, wakeTime: defaults[i].wake, isFreeDay };
  });
}

function buildDefaultSleepBankInputs(baseDate: string, totalSleepMinutes: number): SleepBankDayInput[] {
  const offsets = [6, 5, 4, 3, 2, 1, 0];
  const durations = [440, 430, 510, 490, 420, 450, totalSleepMinutes > 0 ? totalSleepMinutes : 440];
  return offsets.map((ago, i) => ({
    date: getDateOffset(baseDate, ago),
    sleepDurationMinutes: durations[i],
    sleepNeedMinutes: i === 6 ? 465 : 480,
  }));
}

function extractSleepRecords(data: OuraHealthHubData): DailySleepRecord[] {
  if (data.enhancedHistory && data.enhancedHistory.length >= 2) {
    return data.enhancedHistory.map((day) => {
      const bed = formatTimeHHMM(day.bedtime_start, '23:00');
      const wake = formatTimeHHMM(day.bedtime_end, '07:00');
      const d = new Date(`${day.date}T12:00:00`);
      const isFreeDay = !isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6);
      return { date: day.date, bedtime: bed, wakeTime: wake, isFreeDay };
    });
  }
  const baseDate = data.date || getTodayWarsaw();
  return buildDefaultSleepRecords(baseDate, data.enhanced?.bedtime_start, data.enhanced?.bedtime_end);
}

function extractSleepBankInputs(data: OuraHealthHubData, totalSleepMinutes: number): SleepBankDayInput[] {
  if (data.enhancedHistory && data.enhancedHistory.length >= 2) {
    return data.enhancedHistory.map((day) => ({
      date: day.date,
      sleepDurationMinutes: Math.round((day.total_sleep_hours ?? 0) * 60),
      sleepNeedMinutes: 480,
    }));
  }
  const baseDate = data.date || getTodayWarsaw();
  return buildDefaultSleepBankInputs(baseDate, totalSleepMinutes);
}

export function SleepIntelligenceView({ data }: { data: OuraHealthHubData }) {
  const enhanced = data.enhanced;
  const oura = data.oura;
  const context = data.nightContext ?? data.todayContext;

  const totalSleepHours = enhanced?.total_sleep_hours ?? oura?.total_sleep_hours ?? 0;
  const totalSleepMinutes = Math.round(totalSleepHours * 60);
  const deepMinutes = Math.round((enhanced?.deep_sleep_hours ?? oura?.deep_sleep_hours ?? 0) * 60);
  const remMinutes = Math.round((enhanced?.rem_sleep_hours ?? oura?.rem_sleep_hours ?? 0) * 60);

  const readinessScore = oura?.readiness_score ?? enhanced?.readiness_score ?? 0;
  const sleepScore = oura?.sleep_score ?? enhanced?.sleep_score ?? 0;
  const avgHrv = enhanced?.sleep_average_hrv ? Math.round(enhanced.sleep_average_hrv) : null;
  const lowestHr = enhanced?.sleep_lowest_heart_rate ? Math.round(enhanced.sleep_lowest_heart_rate) : null;

  const timelineItems = buildDayTimeline({
    date: data.date ?? 'today',
    sleep: {
      bedtime_start: enhanced?.bedtime_start,
      bedtime_end: enhanced?.bedtime_end,
      sleep_score: sleepScore > 0 ? sleepScore : null,
      total_sleep_hours: totalSleepHours > 0 ? totalSleepHours : null,
      deep_sleep_hours: enhanced?.deep_sleep_hours,
      hrv_average: avgHrv,
    },
    activities: data.stravaActivities,
    recoveryHighMinutes: enhanced?.recovery_high_minutes,
    stressHighMinutes: enhanced?.stress_high_minutes,
  });

  const sleepConsistency = calculateSleepConsistency(extractSleepRecords(data));

  const sleepBank = calculateSleepBank(extractSleepBankInputs(data, totalSleepMinutes));

  const caffeineAmount =
    context?.caffeine?.status === 'available' && typeof context.caffeine.amountMg === 'number'
      ? context.caffeine.amountMg
      : 0;
  const caffeineLogs =
    caffeineAmount > 0 ? [{ amountMg: caffeineAmount, loggedAt: new Date().toISOString() }] : [];
  const caffeineCutoffResult = calculateCaffeineCutoff('23:00', caffeineLogs);

  const dynamicFuelingResult = calculateDynamicFueling({
    baseCalories: 2000,
    activeBurnCalories:
      enhanced?.active_calories ??
      (data.strainRow?.strain_score ? Math.round(data.strainRow.strain_score * 45) : 450),
    consumedCalories: data.nutrition?.calories ?? 0,
    goal: 'maintain',
  });

  const diagnosis = getSleepDiagnosis(readinessScore);

  return (
    <div className="space-y-5 pb-12">
      <ThreeRingHeroCard
        strainScore={data.strainRow?.strain_score}
        recoveryScore={readinessScore > 0 ? readinessScore : null}
        sleepScore={sleepScore > 0 ? sleepScore : null}
        dateFormatted={data.date ?? undefined}
      />

      <StressEnergyBankCard
        input={{
          recoveryScore: readinessScore > 0 ? readinessScore : null,
          sleepScore: sleepScore > 0 ? sleepScore : null,
          strainScore: data.strainRow?.strain_score,
          stressScore: oura?.stress_score,
          stressHighMinutes: enhanced?.stress_high_minutes,
          recoveryHighMinutes: enhanced?.recovery_high_minutes,
          stressDaySummary: enhanced?.stress_day_summary,
        }}
      />

      <SleepNeedBreakdownCard
        input={{
          baselineMinutes: 465,
          strainScore: data.strainRow?.strain_score,
          sleepDebtHours: 0.5,
        }}
      />

      {/* Analiza regularności snu & Social Jetlag */}
      <SleepConsistencyCard data={sleepConsistency} />

      {/* Bank Snu & Bilans 14 Dni */}
      <SleepBankCard data={sleepBank} />

      {/* Rekomendacja Pory Snu i Latencja (Bevel Bedtime Engine) */}
      <BedtimeTargetCard
        targetWakeTime={formatTimeHHMM(enhanced?.bedtime_end, '07:00')}
        targetSleepMinutes={480}
        sleepEfficiencyPercent={enhanced?.sleep_efficiency ?? 88}
        sleepLatencyMinutes={enhanced?.sleep_latency_minutes ?? 14}
        paybackAdjustmentMinutes={sleepBank.recommendedNightlyExtensionMinutes}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Gotowość</span>
            <Activity size={15} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {readinessScore > 0 ? readinessScore : '—'}
            </span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            {readinessScore >= 75 ? 'Optymalna' : readinessScore >= 60 ? 'Umiarkowana' : 'Niska'}
          </p>
        </div>

        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Sen całkowity</span>
            <Moon size={15} className="text-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-text-primary tracking-tight">
              {totalSleepMinutes > 0 ? formatMinutes(totalSleepMinutes) : '—'}
            </span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Wynik snu: {sleepScore > 0 ? `${sleepScore}/100` : '—'}
          </p>
        </div>
      </div>

      <SleepDiagnosisCard diagnosis={diagnosis} />

      <DayTimelineCard items={timelineItems} dateFormatted={data.date ?? undefined} />

      <TargetStrainGaugeCard
        recoveryScore={readinessScore}
        strainScore={data.strainRow?.strain_score}
        userId={data.oura?.user_id ?? data.strainRow?.user_id}
      />

      {context && <SleepFactorsSection context={context} />}

      <SleepRecoveryArchitecture
        deepMinutes={deepMinutes}
        remMinutes={remMinutes}
        totalSleepMinutes={totalSleepMinutes}
        avgHrv={avgHrv}
        lowestHr={lowestHr}
        formatMinutes={formatMinutes}
        hypnogramString={enhanced?.sleep_phase_5_min}
        sleepContributors={enhanced?.sleep_contributors as Record<string, number>}
      />

      <HabitImpactCard correlations={data.correlations} />

      {/* Okno kofeinowe & Dynamiczny bilans paliwa */}
      <CaffeineCutoffCard caffeine={caffeineCutoffResult} fueling={dynamicFuelingResult} />

      <SleepEveningActionCard />
    </div>
  );
}
