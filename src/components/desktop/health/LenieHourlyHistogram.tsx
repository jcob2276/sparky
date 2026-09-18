import React from 'react';
import type { LenieHour24Slot } from '../desktopUtils';

interface LenieHourlyHistogramProps {
  hourly24: LenieHour24Slot[];
  topHoursText: string;
  nightWindowPct: number;
  afternoonWindowPct: number;
}

export default function LenieHourlyHistogram({
  hourly24,
  topHoursText,
  nightWindowPct,
  afternoonWindowPct,
}: LenieHourlyHistogramProps) {
  const maxCount = Math.max(...hourly24.map((h) => h.count), 1);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-2xs">
        <span className="text-text-muted font-medium">
          Rozkład 24h (strefa Warszawa):
        </span>
        <div className="flex items-center gap-2.5 text-3xs">
          <span className="flex items-center gap-1 text-danger font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
            20:00–01:00 ({nightWindowPct}%)
          </span>
          <span className="flex items-center gap-1 text-warning font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
            13:00–17:00 ({afternoonWindowPct}%)
          </span>
        </div>
      </div>

      {/* 24 bars container */}
      <div className="flex items-end gap-1 h-9 pt-1 px-1 bg-surface-ground/30 rounded border border-border-custom/20">
        {hourly24.map((slot) => {
          const barHeightPct = slot.count > 0 ? Math.max(12, Math.round((slot.count / maxCount) * 100)) : 4;
          const isNightCritical = slot.hour >= 20 || slot.hour <= 1;
          const isAfternoon = slot.hour >= 13 && slot.hour <= 17;

          let barBg = 'bg-text-muted/15';
          if (slot.count > 0) {
            if (isNightCritical) barBg = slot.isPeak ? 'bg-danger shadow-sm shadow-danger/50' : 'bg-danger/60';
            else if (isAfternoon) barBg = 'bg-warning/80';
            else barBg = 'bg-primary/50';
          }

          return (
            <div
              key={slot.hour}
              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-default"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                <div className="bg-surface-elevated text-text-primary text-3xs font-mono px-1.5 py-0.5 rounded shadow border border-border-custom">
                  {slot.label}:00 – {slot.count}× ({slot.pct}%)
                </div>
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t-xs ui-interactive ${barBg}`}
                style={{ height: `${barHeightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Axis ticks */}
      <div className="flex justify-between text-3xs font-mono text-text-muted/60 px-0.5">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span>23:00</span>
      </div>

      {topHoursText && (
        <div className="text-2xs text-text-muted/80 flex items-center gap-1.5 mt-0.5">
          <span className="font-semibold text-text-secondary">Najczęstsze godziny:</span>
          <span className="font-mono text-text-primary">{topHoursText}</span>
        </div>
      )}
    </div>
  );
}
