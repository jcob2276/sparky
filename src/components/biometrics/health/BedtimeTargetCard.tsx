import React from 'react';
import { Bed, Clock, Moon, Sparkles, Wind } from 'lucide-react';
import { BedtimeTargetInput, calculateBedtimeTarget } from '@vanguard/domain';

export interface BedtimeTargetCardProps {
  targetWakeTime?: string;
  targetSleepMinutes?: number;
  sleepEfficiencyPercent?: number | null;
  sleepLatencyMinutes?: number | null;
  paybackAdjustmentMinutes?: number | null;
}

export const BedtimeTargetCard: React.FC<BedtimeTargetCardProps> = ({
  targetWakeTime = '07:00',
  targetSleepMinutes = 480,
  sleepEfficiencyPercent,
  sleepLatencyMinutes,
  paybackAdjustmentMinutes,
}) => {
  const result = calculateBedtimeTarget({
    targetWakeTime,
    targetSleepMinutes,
    sleepEfficiencyPercent,
    sleepLatencyMinutes,
    paybackAdjustmentMinutes,
  } as BedtimeTargetInput);

  return (
    <div className="rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-info">
            <Moon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Cel Pory Snu i Latencja</h3>
            <p className="text-xs text-secondary">Kompensacja wydajności snu i czasu zasypiania</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2.5 py-0.5 text-xs font-medium text-info">
          <Sparkles className="h-3 w-3" />
          Wydajność {result.efficiencyUsed}%
        </span>
      </div>

      {/* Target Schedule Highlights */}
      <div className="grid grid-cols-2 gap-2">
        {/* Recommended Bedtime */}
        <div className="rounded-xl bg-surface-2 p-3 space-y-1">
          <p className="text-xs text-secondary flex items-center gap-1">
            <Bed className="h-3.5 w-3.5 text-info" /> Do łóżka
          </p>
          <p className="text-2xl font-bold text-primary tracking-tight">{result.recommendedBedtime}</p>
          <p className="text-3xs text-muted">Czas w łóżku: {result.inBedDurationFormatted}</p>
        </div>

        {/* Wind-down Phase */}
        <div className="rounded-xl bg-surface-2 p-3 space-y-1">
          <p className="text-xs text-secondary flex items-center gap-1">
            <Wind className="h-3.5 w-3.5 text-warning" /> Start wyciszenia
          </p>
          <p className="text-2xl font-bold text-warning tracking-tight">{result.recommendedWindDownTime}</p>
          <p className="text-3xs text-muted">45m przed snem (mniej światła)</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-border-custom bg-surface-2/40 p-2">
          <span className="text-3xs text-secondary block">Docelowa pobudka</span>
          <span className="font-semibold text-primary flex items-center justify-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-secondary" /> {result.targetWakeTime}
          </span>
        </div>

        <div className="rounded-lg border border-border-custom bg-surface-2/40 p-2">
          <span className="text-3xs text-secondary block">Czysty sen</span>
          <span className="font-semibold text-primary mt-0.5 block">
            {Math.floor(result.targetSleepMinutes / 60)}h {result.targetSleepMinutes % 60 > 0 ? `${result.targetSleepMinutes % 60}m` : ''}
          </span>
        </div>

        <div className="rounded-lg border border-border-custom bg-surface-2/40 p-2">
          <span className="text-3xs text-secondary block">Śr. latencja</span>
          <span className="font-semibold text-primary mt-0.5 block">
            {result.latencyUsed} min
          </span>
        </div>
      </div>

      {/* Latency insight tag */}
      <div className="flex items-center justify-between text-xs rounded-lg bg-surface-2/60 px-3 py-1.5 border border-border-custom">
        <span className="text-secondary">Ocena zasypiania:</span>
        <span
          className={`font-medium ${
            result.latencyAssessment === 'optimal'
              ? 'text-success'
              : result.latencyAssessment === 'sleep_deprived'
              ? 'text-warning'
              : 'text-info'
          }`}
        >
          {result.latencyLabel}
        </span>
      </div>

      {/* Recommendation */}
      <p className="text-xs leading-relaxed text-secondary border-t border-border-custom pt-2">
        {result.recommendation}
      </p>
    </div>
  );
};
