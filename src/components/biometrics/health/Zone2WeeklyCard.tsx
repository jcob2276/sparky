/**
 * @file Zone2WeeklyCard.tsx
 * @role Karta tygodniowej akumulacji Strefy 2 (Zone 2 Cardio Tracker) w stylu Bevel / Petera Attii.
 */

import { HeartPulse, CheckCircle2 } from 'lucide-react';
import { computeZone2Weekly, type Zone2ActivityInput } from '@vanguard/domain';

interface Zone2WeeklyCardProps {
  activities?: Zone2ActivityInput[] | null;
  asOfDateStr?: string;
}

export function Zone2WeeklyCard({ activities, asOfDateStr }: Zone2WeeklyCardProps) {
  const result = computeZone2Weekly(activities, asOfDateStr);
  const {
    targetMinutes,
    accumulatedMinutes,
    percentage,
    remainingMinutes,
    status,
    dailyBreakdown,
    explanation,
  } = result;

  const isAchieved = status === 'target_achieved';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse size={18} className="text-info" />
          <h3 className="text-sm font-semibold tracking-wide text-text-primary">
            Strefa 2 (Baza Tlenowa)
          </h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            isAchieved
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-info/30 bg-info/10 text-info'
          }`}
        >
          {accumulatedMinutes} / {targetMinutes} min
        </span>
      </div>

      {/* Pasek postępu tygodniowego */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
          <span>Cel tygodniowy (Protokół Attii)</span>
          <span className="font-bold text-text-primary">{percentage}%</span>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3/50 p-0.5">
          <div
            className={`h-full rounded-full transition-all ${
              isAchieved ? 'bg-success' : 'bg-info'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            role="progressbar"
            aria-valuenow={Math.min(100, Math.max(0, percentage))}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="flex justify-between text-3xs text-text-muted">
          <span>{isAchieved ? 'Cel zrealizowany' : `Pozostało: ${remainingMinutes} min`}</span>
          <span>Cel: 150 min/tydz.</span>
        </div>
      </div>

      {/* Rozbicie dzienne (Pn-Ndz) */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {dailyBreakdown.map((day) => {
          const hasMinutes = day.minutesZ2 > 0;
          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center rounded-xl border p-2 text-center transition-all ${
                hasMinutes
                  ? 'border-info/30 bg-info/10 text-text-primary'
                  : 'border-border-custom/30 bg-surface-2/30 text-text-muted'
              }`}
            >
              <span className="text-3xs font-medium">{day.dayName}</span>
              <span
                className={`mt-1 text-xs font-bold ${
                  hasMinutes ? 'text-info' : 'text-text-muted'
                }`}
              >
                {hasMinutes ? `${day.minutesZ2}m` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Podsumowanie trenera */}
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-2/60 p-3 text-xs text-text-secondary">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-info" />
        <p className="leading-relaxed">{explanation}</p>
      </div>
    </section>
  );
}
