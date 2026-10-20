import { HeartHandshake } from 'lucide-react';
import { BiologicalAgeCard } from '../health/BiologicalAgeCard';
import { HealthMonitorSlidersCard } from '../health/HealthMonitorSlidersCard';
import { buildHubSleepInsights } from './hubSleepInsights';
import { OuraMetricCard } from './OuraMetricCard';
import type { OuraHealthHubData } from './types';

function ageOnDate(birthDate: string | null | undefined, date: string | null | undefined) {
  if (!birthDate || !date) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const current = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(current.getTime())) return null;
  let age = current.getUTCFullYear() - birth.getUTCFullYear();
  if (
    current.getUTCMonth() < birth.getUTCMonth()
    || (current.getUTCMonth() === birth.getUTCMonth() && current.getUTCDate() < birth.getUTCDate())
  ) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/**
 * „Regeneracja i serce”: monitor parametrów życiowych (HRV, tętno, oddech, temperatura, SpO2)
 * oraz wiek biologiczny/naczyniowy. Wyniki gotowości i snu żyją na zakładce Dziś.
 */
export function OuraVitalsView({ data }: { data: OuraHealthHubData }) {
  const date = data.date ?? data.oura?.date ?? data.enhanced?.date ?? null;
  const enhanced = date && data.enhanced?.date === date ? data.enhanced : null;
  const oura = date && data.oura?.date === date ? data.oura : null;
  const insights = buildHubSleepInsights(data);
  const vascularAge = enhanced?.vascular_age;
  const chronologicalAge = ageOnDate(data.birthDateStr, date);
  const vascularAgeDelta = vascularAge == null || chronologicalAge == null
    ? null
    : Math.round(vascularAge - chronologicalAge);

  return (
    <div className="space-y-5">
      <HealthMonitorSlidersCard data={{ ...data, date, oura, enhanced }} />
      <BiologicalAgeCard
        chronologicalAge={chronologicalAge}
        vo2Max={data.garminVo2Max ?? enhanced?.vo2_max ?? null}
        restingHeartRate={enhanced?.sleep_lowest_heart_rate ?? oura?.rhr_avg ?? null}
        hrvBaselineMs={enhanced?.sleep_average_hrv ?? oura?.hrv_avg}
        sleepDebtMinutes={insights.sleepDebtMinutes}
        biologicalSex={data.biologicalSex}
      />
      <OuraMetricCard
        accent="purple"
        icon={HeartHandshake}
        label="Wiek sercowo-naczyniowy"
        status={vascularAgeDelta == null
          ? 'Porównanie z wiekiem niedostępne'
          : `${vascularAgeDelta > 0 ? '+' : '−'}${Math.abs(vascularAgeDelta)} lat względem wieku`}
        value={vascularAge == null ? 'Brak danych' : `${Math.round(vascularAge)} lata`}
      />
    </div>
  );
}
