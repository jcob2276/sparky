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
import { buildDayTimeline } from '@vanguard/domain';

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

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

  const diagnosis = (() => {
    if (readinessScore >= 80) {
      return {
        title: 'Wysoka regeneracja i gotowość',
        desc: 'Oura odnotowała wysoki wynik gotowości. To jeden sygnał; decyzja treningowa uwzględnia też plan, ból, chorobę i ostatnie wykonanie.',
        status: 'optimal' as const,
      };
    }
    if (readinessScore >= 65) {
      return {
        title: 'Średnia regeneracja — umiarkowany wysiłek',
        desc: 'Wynik Oury znajduje się w środkowym zakresie. Sprawdź wspólną decyzję treningową i swoje odczucia przed sesją.',
        status: 'moderate' as const,
      };
    }
    return {
      title: readinessScore > 0 ? 'Niższy wynik gotowości' : 'Brak aktualnego wyniku gotowości',
      desc: 'Sam wskaźnik nie ustala przyczyny zmęczenia. Brak danych nie potwierdza gotowości do zwiększenia obciążenia.',
      status: 'low' as const,
    };
  })();

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

      <SleepEveningActionCard />
    </div>
  );
}
