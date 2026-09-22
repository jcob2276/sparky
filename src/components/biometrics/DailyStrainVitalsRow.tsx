/**
 * @component DailyStrainVitalsRow
 * @role Wiersz witalności (HRV/RHR/sen/temp/kroki) z kolorowaniem z-score oraz wierszem zaawansowanych parametrów (oddech, SpO2, efektywność, zasypianie) i rekomendacją pór snu.
 * @usedBy DailyStrainCard
 */
import React, { useState } from 'react';
import { Zap, Activity, Moon, Thermometer, Footprints, ChevronDown } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import type { Tables } from '../../lib/database.types';
import { StatHero } from '../ui/StatHero';
import { zToVitalColor } from './dailyStrainCardStyles';
import {
  TrendArrow,
  SecondaryVitalsRow,
  SleepStagesRow,
  CardiovascularRow,
  BedtimeAdviceBanner,
} from './DailyStrainSecondaryRows';

interface DailyStrainVitalsRowProps {
  oura: Tables<'oura_daily_summary'>;
  ouraYesterday?: Tables<'oura_daily_summary'> | null;
  enhanced?: Tables<'oura_enhanced'> | null;
  enhancedYesterday?: Tables<'oura_enhanced'> | null;
  hrvZ?: number | null;
  rhrZ?: number | null;
  sleepZ?: number | null;
  sleepScoreToday?: number | null;
}

function getBedtimeRecommendationLabel(rec: string | null): string | null {
  if (!rec) return null;
  switch (rec) {
    case 'earlier_bedtime': return 'Oura: Sugerowane wcześniejsze pójście spać';
    case 'later_bedtime': return 'Oura: Sugerowane późniejsze pójście spać';
    case 'optimal': return 'Oura: Pora snu jest optymalna';
    case 'improve_consistency': return 'Oura: Zadbaj o regularność pór snu';
    default: return null;
  }
}

function formatVitalValue(
  today: number | null | undefined,
  yesterday: number | null | undefined,
  unit: string,
  better: 'higher' | 'lower' | 'neutral',
) {
  if (today == null) return '--';
  return (
    <span className="flex items-center justify-center">
      {today.toLocaleString()}{unit}
      <TrendArrow today={today} yesterday={yesterday} better={better} />
    </span>
  );
}

export default function DailyStrainVitalsRow({
  oura,
  ouraYesterday,
  enhanced,
  enhancedYesterday,
  hrvZ,
  rhrZ,
  sleepZ,
  sleepScoreToday,
}: DailyStrainVitalsRowProps) {
  const [showTelemetry, setShowTelemetry] = useState(false);

  const sleepRawVal =
    sleepScoreToday != null
      ? `${sleepScoreToday}pts`
      : oura.total_sleep_hours
        ? `${Math.floor(oura.total_sleep_hours)}h${Math.round((oura.total_sleep_hours % 1) * 60)}m`
        : null;

  const sleepVal = sleepRawVal ? (
    <span className="flex items-center justify-center">
      {sleepRawVal}
      <TrendArrow today={oura.total_sleep_hours} yesterday={ouraYesterday?.total_sleep_hours} better="higher" />
    </span>
  ) : (
    '--'
  );

  const tempVal =
    oura.temp_deviation != null ? `${oura.temp_deviation > 0 ? '+' : ''}${oura.temp_deviation}°` : '--';

  const vitals = [
    {
      icon: Zap,
      label: 'HRV',
      value: formatVitalValue(oura.hrv_avg, ouraYesterday?.hrv_avg, 'ms', 'higher'),
      color: zToVitalColor(hrvZ, 'text-dayA'),
    },
    {
      icon: Activity,
      label: 'RHR',
      value: formatVitalValue(oura.rhr_avg, ouraYesterday?.rhr_avg, 'bpm', 'lower'),
      color: zToVitalColor(rhrZ, 'text-dayB'),
    },
    {
      icon: Moon,
      label: 'Sen',
      value: sleepVal,
      color: zToVitalColor(
        sleepZ,
        oura.total_sleep_hours == null
          ? 'text-text-muted'
          : oura.total_sleep_hours >= 7.5
            ? 'text-success dark:text-success'
            : oura.total_sleep_hours >= 6
              ? 'text-warning dark:text-warning'
              : 'text-danger dark:text-danger',
      ),
    },
    {
      icon: Thermometer,
      label: 'Temp',
      value: tempVal,
      color: Math.abs(oura.temp_deviation || 0) > 0.5 ? 'text-danger' : 'text-text-secondary',
    },
    {
      icon: Footprints,
      label: 'Kroki',
      value: formatVitalValue(oura.steps, ouraYesterday?.steps, '', 'higher'),
      color: 'text-dayC',
    },
  ];

  const bedtimeAdvice = getBedtimeRecommendationLabel(oura.sleep_time_recommendation);

  return (
    <div className="space-y-3 relative z-[var(--z-raised)]">
      {/* Primary Vitals Row */}
      <div className="h-px bg-border-custom/30" />
      <div className="flex items-center justify-between">
        {vitals.map(({ icon: Icon, label, value, color }, idx) => (
          <div
            key={label}
            className={`flex-1 flex flex-col items-center text-center ${idx > 0 ? 'border-l border-border-custom/30' : ''}`}
          >
            <StatHero value={value} label={label} icon={Icon} color={color} size="sm" />
          </div>
        ))}
      </div>

      <BedtimeAdviceBanner advice={bedtimeAdvice} />

      <div className="pt-0.5">
        <Pressable
          onClick={() => setShowTelemetry(!showTelemetry)}
          className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl border border-border-custom/40 bg-surface-solid/30 hover:bg-surface-solid/60 text-3xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <span>{showTelemetry ? 'Zwiń szczegóły biometryczne' : 'Szczegóły biometrii (fazy snu, SpO₂, naczynia)'}</span>
          <ChevronDown size={12} className={`transition-transform duration-[var(--motion-fast)] ${showTelemetry ? 'rotate-180' : ''}`} />
        </Pressable>

        {showTelemetry && (
          <div className="mt-3 space-y-3">
            <SecondaryVitalsRow
              oura={oura}
              ouraYesterday={ouraYesterday}
              enhanced={enhanced}
              enhancedYesterday={enhancedYesterday}
            />

            <SleepStagesRow
              oura={oura}
              ouraYesterday={ouraYesterday}
              enhanced={enhanced}
              enhancedYesterday={enhancedYesterday}
            />

            <CardiovascularRow enhanced={enhanced} />
          </div>
        )}
      </div>
    </div>
  );
}
