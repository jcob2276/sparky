/**
 * @component DailyStrainMetricsRow
 * @role Wiersz metryk strain/recovery (StatHero).
 * @usedBy DailyStrainCard
 */
import React from 'react';
import { StatHero } from '../ui/StatHero';

interface DailyStrainMetricsRowProps {
  strainScore: number | null;
  strainTone: string;
  recoveryScore: number | null;
  recovTone: string;
  fuelingScore?: number | null;
  fuelingProvisional?: boolean;
  sleepDebtH?: number | null;
}

function formatSleepDebt(val: number): string {
  const totalMinutes = Math.round(Math.abs(val) * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
}

export default function DailyStrainMetricsRow({
  strainScore,
  strainTone,
  recoveryScore,
  recovTone,
  fuelingScore,
  fuelingProvisional = false,
  sleepDebtH,
}: DailyStrainMetricsRowProps) {
  const metricCols = 2 + (fuelingScore != null ? 1 : 0) + (sleepDebtH != null ? 1 : 0);

  return (
    <div className="grid gap-4 relative z-[var(--z-raised)]" style={{ gridTemplateColumns: `repeat(${metricCols}, 1fr)` }}>
      <div>
        <StatHero value={strainScore ?? '--'} label="Strain" suffix="/21" color={strainTone} size="sm" />
        <div className="mt-1.5 h-[var(--ds-h-2px)] bg-border-custom/40 rounded-full">
          <div className="h-[var(--ds-h-2px)] rounded-full bg-warning ui-interactive" style={{ width: `${Math.min(100, ((strainScore ?? 0) / 21) * 100)}%` }} />
        </div>
      </div>

      <div>
        <StatHero value={recoveryScore ?? '--'} label="Recovery" suffix="/100" color={recovTone} size="sm" />
        <div className="mt-1.5 h-[var(--ds-h-2px)] bg-border-custom/40 rounded-full">
          <div className={`h-[var(--ds-h-2px)] rounded-full ui-interactive ${recoveryScore == null ? 'bg-surface-3' : recoveryScore >= 75 ? 'bg-success' : recoveryScore >= 55 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${Math.min(100, recoveryScore ?? 0)}%` }} />
        </div>
      </div>

      {fuelingScore != null && (
        <div>
          <StatHero value={fuelingScore} label={fuelingProvisional ? 'Fueling · wstępne' : 'Fueling'} suffix="/100" color={fuelingProvisional ? 'text-text-muted' : fuelingScore >= 70 ? 'text-success' : 'text-warning'} size="sm" />
          <div className="mt-1.5 h-[var(--ds-h-2px)] bg-border-custom/40 rounded-full">
            <div className={`h-[var(--ds-h-2px)] rounded-full ui-interactive ${fuelingProvisional ? 'bg-surface-3' : fuelingScore >= 70 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, fuelingScore)}%` }} />
          </div>
        </div>
      )}

      {sleepDebtH != null && (
        <div>
          <StatHero
            value={formatSleepDebt(sleepDebtH)}
            label={sleepDebtH === 0 ? 'Bilans snu' : sleepDebtH < 0 ? 'Deficyt snu' : 'Nadwyżka snu'}
            color={sleepDebtH < -0.5 ? 'text-danger' : sleepDebtH > 0.5 ? 'text-success' : 'text-text-primary'}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
