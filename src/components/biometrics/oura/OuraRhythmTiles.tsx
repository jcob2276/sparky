import { AlarmClock, CalendarCheck, Hourglass } from 'lucide-react';
import { buildHubSleepInsights, minutesValue } from './hubSleepInsights';
import { OuraMetricCard } from './OuraMetricCard';
import type { OuraHealthHubData } from './types';

function sleepBalanceValue(minutes: number | null): string {
  if (minutes == null) return 'Brak danych';
  const formatted = minutesValue(Math.abs(minutes));
  if (minutes > 0) return `${formatted} nadwyżki`;
  if (minutes < 0) return `${formatted} długu`;
  return 'Bilans wyrównany';
}

/** Kafle rytmu: zegar biologiczny, regularność (pomiar Oura), bilans snu. */
export function OuraRhythmTiles({ data }: { data: OuraHealthHubData }) {
  const insights = buildHubSleepInsights(data);
  const offset = insights.circadianOffsetMinutes;
  const clockStatus = offset == null
    ? 'Potrzeba co najmniej 2 nocy'
    : `${offset >= 0 ? '+' : '−'}${Math.abs(offset)} min · zmienność ${minutesValue(insights.circadianVariabilityMinutes)} · ${insights.circadianConfidence}`;
  const balanceStatus = insights.sleepDebtDays > 0
    ? `${insights.sleepDebtDays} nocy · cel ${minutesValue(insights.personalNeedMinutes)} (${insights.personalNeedSource === 'personal' ? 'osobisty' : 'typowy'}) · potrzeba ${minutesValue(insights.totalNeededMinutes)} − sen ${minutesValue(insights.totalSleptMinutes)}`
    : 'Potrzeba danych historycznych';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <OuraMetricCard accent="blue" icon={AlarmClock} label="Zegar biologiczny" status={clockStatus} value={insights.circadianStatus ?? 'Kalibracja'} />
      <OuraMetricCard accent="green" icon={CalendarCheck} label="Wynik regularności" status="Pomiar Oura" value={insights.regularityScore == null ? 'Brak danych' : String(Math.round(insights.regularityScore))} />
      <div className="sm:col-span-2">
        <OuraMetricCard accent="orange" icon={Hourglass} label="Bilans snu" status={balanceStatus} value={sleepBalanceValue(insights.sleepBalanceMinutes)} />
      </div>
    </div>
  );
}
