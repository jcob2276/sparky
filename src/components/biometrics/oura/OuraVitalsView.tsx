import {
  Activity,
  AlarmClock,
  CalendarCheck,
  Footprints,
  Gauge,
  HeartHandshake,
  HeartPulse,
  Hourglass,
  Moon,
  Thermometer,
  Wind,
} from 'lucide-react';
import { buildOuraSleepInsights } from '../../../lib/biometrics/ouraSleepInsights';
import { OuraMetricCard } from './OuraMetricCard';
import type { OuraHealthHubData } from './types';

interface OuraVitalsViewProps {
  data: OuraHealthHubData;
  onOpenSleep: () => void;
}

const value = (input: number | null | undefined, suffix = '') =>
  input == null ? 'Brak danych' : `${Math.round(input)}${suffix}`;

function minutesValue(minutes: number | null): string {
  if (minutes == null) return 'Brak danych';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

function ageOnDate(birthDate: string | null | undefined, date: string | null | undefined) {
  if (!birthDate || !date) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const current = new Date(`${date}T00:00:00Z`);
  let age = current.getUTCFullYear() - birth.getUTCFullYear();
  if (
    current.getUTCMonth() < birth.getUTCMonth()
    || (current.getUTCMonth() === birth.getUTCMonth() && current.getUTCDate() < birth.getUTCDate())
  ) age -= 1;
  return age;
}

export function OuraVitalsView({ data, onOpenSleep }: OuraVitalsViewProps) {
  const enhancedHistory = data.enhancedHistory ?? [];
  const currentInHistory = enhancedHistory.some((day) => day.date === data.enhanced?.date);
  const insightHistory = currentInHistory || !data.enhanced
    ? enhancedHistory
    : [...enhancedHistory, data.enhanced];
  const sleepInsights = buildOuraSleepInsights(data.enhanced ?? null, insightHistory);
  const vascularAge = data.enhanced?.vascular_age;
  const chronologicalAge = ageOnDate(data.birthDateStr, data.date);
  const vascularAgeDelta = vascularAge == null || chronologicalAge == null
    ? null
    : Math.round(vascularAge - chronologicalAge);
  const circadianOffset = sleepInsights.circadianOffsetMinutes;
  const circadianStatus = circadianOffset == null
    ? 'Potrzeba co najmniej 2 nocy'
    : `${circadianOffset >= 0 ? '+' : '−'}${Math.abs(circadianOffset)} min od rytmu`;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-text-muted">{data.date ?? 'Ostatni dostępny dzień'}</p>
        <h2 className="mt-1 text-3xl font-light text-white">Parametry życiowe</h2>
      </header>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-text-primary">
          <Activity size={20} className="text-info" /> Gotowość
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="blue" icon={Gauge} label="Wynik gotowości" status="Bieżący wynik" value={value(data.oura?.readiness_score)} />
          <OuraMetricCard accent="green" icon={HeartPulse} label="HRV" status="Średnia nocna" value={value(data.oura?.hrv_avg, ' ms')} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-text-primary">
          <Moon size={20} className="text-success" /> Sen
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="green" icon={Moon} label="Wynik snu" status="Szczegóły nocy" value={value(data.enhanced?.sleep_score ?? data.oura?.sleep_score)} onClick={onOpenSleep} />
          <OuraMetricCard accent="blue" icon={HeartPulse} label="Najniższe tętno" status="Podczas snu" value={value(data.enhanced?.sleep_lowest_heart_rate, ' bpm')} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-text-primary">
          <AlarmClock size={20} className="text-info" /> Rytm i potrzeba snu
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="blue" icon={AlarmClock} label="Zegar biologiczny" status={circadianStatus} value={sleepInsights.circadianStatus ?? 'Kalibracja'} />
          <OuraMetricCard accent="green" icon={CalendarCheck} label="Regularność snu" status="Pomiar Oura" value={value(sleepInsights.regularityScore)} />
          <OuraMetricCard accent="orange" icon={Hourglass} label="Deficyt snu" status={sleepInsights.sleepDebtDays > 0 ? `Suma z ${sleepInsights.sleepDebtDays} dni względem 8 h` : 'Potrzeba danych historycznych'} value={minutesValue(sleepInsights.sleepDebtMinutes)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl font-light text-text-primary">
          <HeartPulse size={20} className="text-danger" /> Serce i oddech
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <OuraMetricCard accent="purple" icon={HeartHandshake} label="Wiek sercowo-naczyniowy" status={vascularAgeDelta == null ? 'Porównanie z wiekiem niedostępne' : `${vascularAgeDelta > 0 ? '+' : '−'}${Math.abs(vascularAgeDelta)} lat względem wieku`} value={vascularAge == null ? 'Brak danych' : `${Math.round(vascularAge)} lata`} />
          <OuraMetricCard accent="blue" icon={Wind} label="Częstotliwość oddechu" status="Średnia podczas snu" value={data.enhanced?.sleep_average_breath == null ? 'Brak danych' : `${data.enhanced.sleep_average_breath.toLocaleString('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}/min`} />
          <OuraMetricCard accent="purple" icon={Thermometer} label="Odchylenie temperatury" value={data.enhanced?.temperature_deviation == null ? 'Brak danych' : `${data.enhanced.temperature_deviation > 0 ? '+' : ''}${data.enhanced.temperature_deviation.toFixed(2)}°C`} />
          <OuraMetricCard accent="orange" icon={Footprints} label="Kroki" value={value(data.oura?.steps)} />
        </div>
      </section>
    </div>
  );
}
