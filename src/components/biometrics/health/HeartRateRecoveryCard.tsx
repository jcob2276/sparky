import React from 'react';
import { Activity, Heart, ShieldAlert, Sparkles } from 'lucide-react';
import { calculateHeartRateRecovery, HeartRateRecoveryCategory } from '@vanguard/domain';

export interface HeartRateRecoveryCardProps {
  peakHeartRate?: number | null;
  heartRateAt60s?: number | null;
  heartRateAt120s?: number | null;
  workoutName?: string;
}

const CATEGORY_STYLES: Record<HeartRateRecoveryCategory, { badge: string; text: string; bg: string }> = {
  excellent: { badge: 'bg-success/10 text-success border-success/30', text: 'text-success', bg: 'bg-success' },
  good: { badge: 'bg-success/10 text-success border-success/30', text: 'text-success', bg: 'bg-success' },
  fair: { badge: 'bg-warning/10 text-warning border-warning/30', text: 'text-warning', bg: 'bg-warning' },
  poor: { badge: 'bg-danger/10 text-danger border-danger/30', text: 'text-danger', bg: 'bg-danger' },
  insufficient_data: { badge: 'bg-surface-2 text-muted border-border-custom', text: 'text-muted', bg: 'bg-muted' },
};

export const HeartRateRecoveryCard: React.FC<HeartRateRecoveryCardProps> = ({
  peakHeartRate,
  heartRateAt60s,
  heartRateAt120s,
  workoutName,
}) => {
  const result = calculateHeartRateRecovery({
    peakHeartRate: peakHeartRate || 0,
    heartRateAt60s,
    heartRateAt120s,
  });

  const style = CATEGORY_STYLES[result.category];

  return (
    <div className="rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-danger">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Odzyskiwanie tętna (HRR)</h3>
            <p className="text-xs text-secondary">
              {workoutName ? `${workoutName} • Reaktywacja nerwu błędnego` : 'Spadek tętna po wysiłku (1m & 2m)'}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
          <Sparkles className="h-3 w-3" />
          {result.categoryLabel}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-2 p-3 text-center">
          <p className="text-xs text-secondary flex items-center justify-center gap-1">
            <Heart className="h-3 w-3 text-danger" /> Szczytowe HR
          </p>
          <p className="mt-1 text-base font-semibold text-primary">
            {result.peakHeartRate > 0 ? `${result.peakHeartRate} bpm` : '—'}
          </p>
        </div>

        <div className="rounded-lg bg-surface-2 p-3 text-center">
          <p className="text-xs text-secondary">Spadek 60s</p>
          <p className={`mt-1 text-base font-semibold ${result.hrDrop60s ? style.text : 'text-primary'}`}>
            {result.hrDrop60s !== null ? `-${result.hrDrop60s} bpm` : '—'}
          </p>
          <span className="text-3xs text-muted block mt-0.5">Norma &gt; 20 bpm</span>
        </div>

        <div className="rounded-lg bg-surface-2 p-3 text-center">
          <p className="text-xs text-secondary">Spadek 120s</p>
          <p className={`mt-1 text-base font-semibold ${result.hrDrop120s ? style.text : 'text-primary'}`}>
            {result.hrDrop120s !== null ? `-${result.hrDrop120s} bpm` : '—'}
          </p>
          <span className="text-3xs text-muted block mt-0.5">Norma &gt; 35 bpm</span>
        </div>
      </div>

      {/* Visual Drop Bar */}
      {result.hrDrop60s !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-secondary">
            <span>Dynamika wyciszenia (60s)</span>
            <span className="font-medium text-primary">{result.hrDrop60s} bpm</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full transition-all duration-500 ${style.bg}`}
              style={{ width: `${Math.min(100, Math.max(10, (result.hrDrop60s / 40) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Autonomic Fatigue Warning */}
      {result.isAutonomicFatigued && (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 border border-danger/20 p-2.5 text-xs text-danger">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Wykryto opóźnioną reaktywację przywspółczulną (&lt; 12 bpm). Ogranicz intensywność kolejnych jednostek i zadbaj o regenerację.
          </span>
        </div>
      )}

      {/* Clinical Recommendation */}
      <p className="text-xs leading-relaxed text-secondary border-t border-border-custom pt-2">
        {result.recommendation}
      </p>
    </div>
  );
};
