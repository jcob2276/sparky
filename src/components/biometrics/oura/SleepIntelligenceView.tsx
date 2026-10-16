import { Moon, Activity } from 'lucide-react';
import type { OuraHealthHubData } from './types';
import { SleepFactorsSection } from './SleepFactorsSection';
import { SleepRecoveryArchitecture } from './SleepRecoveryArchitecture';
import { TargetStrainGaugeCard } from '../health/TargetStrainGaugeCard';
import { HabitImpactCard } from '../health/HabitImpactCard';
import { ThreeRingHeroCard } from '../health/ThreeRingHeroCard';
import { StressEnergyBankCard } from '../health/StressEnergyBankCard';
import { DayTimelineCard } from '../health/DayTimelineCard';
import { SleepDiagnosisCard } from './SleepDiagnosisCard';
import { SleepConsistencyCard } from '../health/SleepConsistencyCard';
import { buildDayTimeline, calculateSleepConsistency } from '@vanguard/domain';
import { getTodayWarsaw } from '../../../lib/date';
import { selectSleepConsistencyRecords } from '../../../lib/biometrics/sleepConsistencyData';
import DataStateNotice from '../../core/DataStateNotice';

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
    title: isModerate ? 'Średni wynik gotowości' : 'Niższy wynik gotowości',
    desc: isModerate
      ? 'Wynik Oury znajduje się w środkowym zakresie. Sprawdź wspólną decyzję treningową i swoje odczucia przed sesją.'
      : 'Sam wskaźnik nie ustala przyczyny zmęczenia. Brak danych nie potwierdza gotowości do zwiększenia obciążenia.',
    status: isModerate ? ('moderate' as const) : ('low' as const),
  };
}

export function SleepIntelligenceView({ data }: { data: OuraHealthHubData }) {
  const enhanced = data.enhanced;
  const oura = data.oura;
  const context = data.nightContext ?? data.todayContext;
  const strainMatchesNight = data.strainRow?.date === data.date;
  const strainScore = strainMatchesNight ? data.strainRow?.strain_score : null;

  const totalSleepHours = enhanced?.total_sleep_hours ?? oura?.total_sleep_hours ?? null;
  const deepHours = enhanced?.deep_sleep_hours ?? oura?.deep_sleep_hours ?? null;
  const remHours = enhanced?.rem_sleep_hours ?? oura?.rem_sleep_hours ?? null;
  const totalSleepMinutes = totalSleepHours == null ? null : Math.round(totalSleepHours * 60);
  const deepMinutes = deepHours == null ? null : Math.round(deepHours * 60);
  const remMinutes = remHours == null ? null : Math.round(remHours * 60);

  const readinessScore = oura?.readiness_score ?? enhanced?.readiness_score ?? null;
  const sleepScore = oura?.sleep_score ?? enhanced?.sleep_score ?? null;
  const avgHrv = enhanced?.sleep_average_hrv ? Math.round(enhanced.sleep_average_hrv) : null;
  const lowestHr = enhanced?.sleep_lowest_heart_rate ? Math.round(enhanced.sleep_lowest_heart_rate) : null;

  const timelineItems = buildDayTimeline({
    date: data.date ?? 'today',
    sleep: {
      bedtime_start: enhanced?.bedtime_start,
      bedtime_end: enhanced?.bedtime_end,
      sleep_score: sleepScore,
      total_sleep_hours: totalSleepHours,
      deep_sleep_hours: enhanced?.deep_sleep_hours,
      hrv_average: avgHrv,
    },
    activities: data.stravaActivities,
    recoveryHighMinutes: enhanced?.recovery_high_minutes,
    stressHighMinutes: enhanced?.stress_high_minutes,
  });

  const sleepRecords = selectSleepConsistencyRecords(data.enhancedHistory ?? [], enhanced, data.date ?? getTodayWarsaw());
  const sleepConsistency = sleepRecords.length >= 2 ? calculateSleepConsistency(sleepRecords) : null;
  const diagnosis = readinessScore == null ? null : getSleepDiagnosis(readinessScore);

  return (
    <div className="space-y-5 pb-12">
      <ThreeRingHeroCard
        strainScore={strainScore}
        recoveryScore={readinessScore}
        sleepScore={sleepScore}
        dateFormatted={data.date ?? undefined}
      />
      {data.strainRow && !strainMatchesNight && <DataStateNotice title="Obciążenie pochodzi z innego dnia" detail={`Zapisane obciążenie dotyczy ${data.strainRow.date}; wybrana noc: ${data.date ?? 'brak daty'}.`} />}

      <StressEnergyBankCard
        input={{
          recoveryScore: readinessScore,
          stressScore: oura?.stress_score,
          stressHighMinutes: enhanced?.stress_high_minutes,
          recoveryHighMinutes: enhanced?.recovery_high_minutes,
        }}
        lastUpdatedFormatted={data.date ?? undefined}
      />

      {sleepConsistency ? <SleepConsistencyCard data={sleepConsistency} sampleSize={sleepRecords.length} /> : (
        <DataStateNotice title="Za mało nocy do analizy regularności" detail={`N=${sleepRecords.length} w ostatnich 7 dniach. Potrzebne są przynajmniej dwie noce z zapisaną porą snu i pobudki.`} />
      )}
      <DataStateNotice title="Brak danych do wyznaczenia celów snu" detail="Zapotrzebowanie na sen i planowana pobudka nie są dostępne w tym podsumowaniu. Nie można wyliczyć banku snu ani pory położenia się spać." />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Gotowość</span>
            <Activity size={15} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {readinessScore ?? '—'}
            </span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            {readinessScore == null ? 'Brak pomiaru gotowości' : readinessScore >= 75 ? 'Optymalna' : readinessScore >= 60 ? 'Umiarkowana' : 'Niska'}
          </p>
        </div>

        <div className="rounded-2xl border border-border-custom bg-surface-solid/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Sen całkowity</span>
            <Moon size={15} className="text-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-text-primary tracking-tight">
              {totalSleepMinutes == null ? '—' : formatMinutes(totalSleepMinutes)}
            </span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Wynik snu: {sleepScore == null ? '—' : `${sleepScore}/100`}
          </p>
        </div>
      </div>

      {diagnosis && <SleepDiagnosisCard diagnosis={diagnosis} />}

      <DayTimelineCard items={timelineItems} dateFormatted={data.date ?? undefined} />

      <TargetStrainGaugeCard
        recoveryScore={readinessScore}
        strainScore={strainScore}
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
        bedtimeStart={enhanced?.bedtime_start}
        bedtimeEnd={enhanced?.bedtime_end}
        date={data.date}
        sleepContributors={enhanced?.sleep_contributors as Record<string, number>}
      />

      <HabitImpactCard correlations={data.correlations} />

    </div>
  );
}
