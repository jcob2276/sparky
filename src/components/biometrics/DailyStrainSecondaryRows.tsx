import React from 'react';
import { Moon, Wind, Droplets, Gauge, Timer } from 'lucide-react';
import type { Tables } from '../../lib/database.types';

export function TrendArrow({
  today,
  yesterday,
  better = 'higher',
}: {
  today: number | null | undefined;
  yesterday: number | null | undefined;
  better?: 'higher' | 'lower' | 'neutral';
}) {
  if (today == null || yesterday == null) return null;
  const t = Number(today);
  const y = Number(yesterday);
  if (t === y) return null;
  const isUp = t > y;

  let color = 'text-text-muted';
  if (better === 'higher') {
    color = isUp ? 'text-success dark:text-success' : 'text-danger dark:text-danger';
  } else if (better === 'lower') {
    color = isUp ? 'text-danger dark:text-danger' : 'text-success dark:text-success';
  }

  return (
    <span className={`text-3xs font-black ml-0.5 select-none ${color}`}>
      {isUp ? '↑' : '↓'}
    </span>
  );
}

function formatHours(h: number | null): string {
  if (h == null || h <= 0) return '--';
  const hrs = Math.floor(h);
  const mins = Math.round((h % 1) * 60);
  return `${hrs}h ${mins}m`;
}

interface SubRowProps {
  oura: Tables<'oura_daily_summary'>;
  ouraYesterday?: Tables<'oura_daily_summary'> | null;
  enhanced?: Tables<'oura_enhanced'> | null;
  enhancedYesterday?: Tables<'oura_enhanced'> | null;
}

export function SecondaryVitalsRow({ oura, ouraYesterday, enhanced, enhancedYesterday }: SubRowProps) {
  const items = [
    {
      icon: Wind,
      label: 'Oddech',
      value: enhanced?.sleep_average_breath ? `${enhanced.sleep_average_breath.toFixed(1)}/m` : '--',
      arrow: <TrendArrow today={enhanced?.sleep_average_breath} yesterday={enhancedYesterday?.sleep_average_breath} better="lower" />,
      color: 'text-text-secondary',
    },
    {
      icon: Droplets,
      label: 'SpO2',
      value: enhanced?.spo2_percentage ? `${Math.round(enhanced.spo2_percentage)}%` : '--',
      arrow: <TrendArrow today={enhanced?.spo2_percentage} yesterday={enhancedYesterday?.spo2_percentage} better="higher" />,
      color: enhanced?.spo2_percentage && enhanced.spo2_percentage < 95 ? 'text-danger' : 'text-text-secondary',
    },
    {
      icon: Gauge,
      label: 'Wydajność',
      value: oura.sleep_efficiency ? `${oura.sleep_efficiency}%` : '--',
      arrow: <TrendArrow today={oura.sleep_efficiency} yesterday={ouraYesterday?.sleep_efficiency} better="higher" />,
      color: oura.sleep_efficiency && oura.sleep_efficiency < 85 ? 'text-warning' : 'text-text-secondary',
    },
    {
      icon: Timer,
      label: 'Zasypianie',
      value: oura.latency_minutes != null ? `${oura.latency_minutes}m` : '--',
      arrow: <TrendArrow today={oura.latency_minutes} yesterday={ouraYesterday?.latency_minutes} better="lower" />,
      color: 'text-text-secondary',
    },
  ];

  return (
    <>
      <div className="h-px bg-border-custom/30" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
        {items.map(({ icon: Icon, label, value, arrow, color }) => (
          <div key={label} className="flex flex-col items-center text-center p-1 sm:border-l sm:border-border-custom/30 first:border-0">
            <div className="flex items-center gap-1 mb-0.5 animate-fadeIn">
              <Icon size={10} className="text-text-muted" />
              <span className="text-3xs uppercase tracking-wider text-text-muted font-bold">{label}</span>
            </div>
            <span className={`text-xs font-black flex items-center justify-center ${color}`}>
              {value}
              {arrow}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function SleepStagesRow({ oura, ouraYesterday, enhanced, enhancedYesterday }: SubRowProps) {
  if (oura.deep_sleep_hours == null && oura.rem_sleep_hours == null) return null;

  return (
    <>
      <div className="h-px bg-border-custom/30" />
      <div className="flex items-center justify-between text-2xs px-1">
        <div className="flex-1 text-center">
          <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Sen Głęboki</span>
          <span className="text-xs font-black text-dayB flex items-center justify-center">
            {formatHours(oura.deep_sleep_hours)}
            <TrendArrow today={oura.deep_sleep_hours} yesterday={ouraYesterday?.deep_sleep_hours} better="higher" />
          </span>
        </div>
        <div className="w-px h-6 bg-border-custom/30" />
        <div className="flex-1 text-center">
          <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Faza REM</span>
          <span className="text-xs font-black text-dayA flex items-center justify-center">
            {formatHours(oura.rem_sleep_hours)}
            <TrendArrow today={oura.rem_sleep_hours} yesterday={ouraYesterday?.rem_sleep_hours} better="higher" />
          </span>
        </div>
        {enhanced?.light_sleep_hours != null && (
          <>
            <div className="w-px h-6 bg-border-custom/30" />
            <div className="flex-1 text-center">
              <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Sen Lekki</span>
              <span className="text-xs font-black text-text-secondary flex items-center justify-center">
                {formatHours(enhanced.light_sleep_hours)}
                <TrendArrow today={enhanced.light_sleep_hours} yesterday={enhancedYesterday?.light_sleep_hours} better="neutral" />
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function CardiovascularRow({ enhanced }: { enhanced?: Tables<'oura_enhanced'> | null }) {
  if (
    enhanced?.vascular_age == null &&
    enhanced?.resilience_level == null &&
    enhanced?.stress_high_minutes == null &&
    enhanced?.vo2_max == null
  ) {
    return null;
  }

  return (
    <>
      <div className="h-px bg-border-custom/30" />
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between text-2xs px-1 gap-2 sm:gap-0">
        <div className="flex-1 text-center">
          <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Wiek Naczyniowy</span>
          <span className="text-xs font-black text-success flex items-center justify-center">
            {enhanced?.vascular_age != null ? `${Math.round(enhanced.vascular_age)} lat` : 'Optymalny'}
          </span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-border-custom/30" />
        <div className="flex-1 text-center">
          <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Odporność</span>
          <span className="text-xs font-black text-primary capitalize flex items-center justify-center">
            {enhanced?.resilience_level || 'Solidna'}
          </span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-border-custom/30" />
        <div className="flex-1 text-center">
          <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">Stres Dnia</span>
          <span className="text-xs font-black text-warning flex items-center justify-center">
            {enhanced?.stress_high_minutes != null ? `${enhanced.stress_high_minutes}m` : 'Niski'}
          </span>
        </div>
        {enhanced?.vo2_max != null && (
          <>
            <div className="hidden sm:block w-px h-6 bg-border-custom/30" />
            <div className="flex-1 text-center">
              <span className="text-3xs text-text-muted uppercase tracking-wider block mb-0.5 font-bold">VO2 Max</span>
              <span className="text-xs font-black text-info flex items-center justify-center">
                {enhanced.vo2_max}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function BedtimeAdviceBanner({ advice }: { advice: string | null }) {
  if (!advice) return null;
  return (
    <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center gap-2 animate-fadeIn">
      <Moon size={11} className="text-primary animate-pulse" />
      <span className="text-2xs font-bold text-text-primary">{advice}</span>
    </div>
  );
}
