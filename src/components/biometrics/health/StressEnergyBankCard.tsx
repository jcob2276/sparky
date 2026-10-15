/**
 * @file StressEnergyBankCard.tsx
 * @role Karta Stress & Energy (Dzienny Stres + Rezerwa Energii / Body Battery) w stylu Bevel Health.
 */

import { Zap, Activity } from 'lucide-react';
import { computeEnergyBank, type EnergyBankInput } from '@vanguard/domain';
import Button from '../../ui/Button';

interface StressEnergyBankCardProps {
  input: EnergyBankInput;
  lastUpdatedFormatted?: string;
  onViewDetails?: () => void;
}

export function StressEnergyBankCard({
  input,
  lastUpdatedFormatted,
  onViewDetails,
}: StressEnergyBankCardProps) {
  const result = computeEnergyBank(input);
  const { stress, energyBank, strainDrain, stressDrain, explanation } = result;

  const stressColorMap = {
    low: {
      badgeBg: 'bg-success/15 border-success/30 text-success',
      text: 'text-success',
      label: 'Niski',
    },
    med: {
      badgeBg: 'bg-warning/15 border-warning/30 text-warning',
      text: 'text-warning',
      label: 'Średni',
    },
    high: {
      badgeBg: 'bg-danger/15 border-danger/30 text-danger',
      text: 'text-danger',
      label: 'Wysoki',
    },
  };

  const currentTheme = stressColorMap[stress.category] || stressColorMap.med;

  let batteryColorClass = 'bg-success';
  if (energyBank < 30) {
    batteryColorClass = 'bg-danger';
  } else if (energyBank < 60) {
    batteryColorClass = 'bg-warning';
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-text-secondary" />
          <h3 className="text-sm font-semibold tracking-wide text-text-primary">
            Stres i Rezerwa Energii
          </h3>
        </div>
        {lastUpdatedFormatted && (
          <span className="text-xs text-text-muted">
            Aktualizacja: {lastUpdatedFormatted}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border-custom/40 bg-surface-2/40 p-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="block text-lg font-bold text-danger">
              {stress.highest}
            </span>
            <span className="text-3xs font-medium text-text-muted">Max</span>
          </div>
          <div>
            <span className="block text-lg font-bold text-success">
              {stress.lowest}
            </span>
            <span className="text-3xs font-medium text-text-muted">Min</span>
          </div>
          <div>
            <span className="block text-lg font-bold text-warning">
              {stress.average}
            </span>
            <span className="text-3xs font-medium text-text-muted">Śr.</span>
          </div>
        </div>

        <div
          className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border ${currentTheme.badgeBg}`}
          aria-label={`Aktualny stres: ${stress.current} ${currentTheme.label}`}
        >
          <span className="text-base font-bold leading-tight tracking-tight">
            {stress.current}
          </span>
          <span className="text-3xs font-semibold uppercase tracking-wider">
            {currentTheme.label}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Zap size={14} className="text-warning fill-warning" />
            <span>Rezerwa energii (Body Battery)</span>
          </span>
          <span className="font-bold tracking-tight text-text-primary">
            {energyBank}%
          </span>
        </div>

        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-surface-3/50 p-0.5">
          <div
            className={`h-full rounded-full transition-all ${batteryColorClass}`}
            style={{ width: `${Math.max(0, Math.min(100, energyBank))}%` }}
            role="progressbar"
            aria-valuenow={Math.max(0, Math.min(100, energyBank))}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div className="flex items-center justify-between text-2xs text-text-muted">
          <span>Drenaż: -{strainDrain}% (trening) • -{stressDrain}% (stres)</span>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="!h-auto !p-0 !text-2xs text-primary"
            >
              Szczegóły →
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        {explanation}
      </p>
    </section>
  );
}
