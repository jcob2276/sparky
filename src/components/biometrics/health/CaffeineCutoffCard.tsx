/**
 * @file CaffeineCutoffCard.tsx
 * @role Karta okna kofeinowego (Caffeine Cutoff Timer) i dynamicznego bilansu paliwa (Fueling)
 * w stylu Bevel Health. Śledzi czas rozpadu kofeiny (half-life) pod kątem ochrony snu głębokiego
 * oraz dynamiczny cel kaloryczny korygowany obciążeniem dziennym (Strain / Active Burn).
 */

import { Coffee, Flame, Moon, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import {
  type CaffeineCutoffResult,
  type DynamicFuelingResult,
} from '@vanguard/domain';

interface CaffeineCutoffCardProps {
  caffeine: CaffeineCutoffResult;
  fueling?: DynamicFuelingResult | null;
}

export function CaffeineCutoffCard({ caffeine, fueling }: CaffeineCutoffCardProps) {
  const isCutoffPassed = caffeine.status === 'cutoff_passed';
  const isBedtimeWarning = caffeine.status === 'bedtime_warning';
  const isApproaching = caffeine.status === 'approaching_cutoff';

  const getStatusBadge = () => {
    if (isBedtimeWarning) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-danger">
          <ShieldAlert size={10} /> Ryzyko dla fazy Deep
        </span>
      );
    }
    if (isCutoffPassed) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
          <Moon size={10} /> Cutoff minął
        </span>
      );
    }
    if (isApproaching) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
          Ostatnia szansa ({caffeine.minutesUntilCutoff} min)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
        <CheckCircle2 size={10} /> Bezpieczne okno
      </span>
    );
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Coffee size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Kofeina & Bilans Paliwa</h3>
            <p className="text-3xs text-text-muted">Optymalizacja snu i wydatku energetycznego</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Grid: Caffeine Cutoff & Bedtime active */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Cutoff Time */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Cutoff kofeiny
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight">{caffeine.cutoffTime}</span>
            <span className="text-3xs text-text-muted">
              (sen {caffeine.targetBedtime})
            </span>
          </div>
          <span className="mt-1 block text-3xs text-text-secondary">
            {caffeine.minutesUntilCutoff > 0
              ? `Za ${Math.floor(caffeine.minutesUntilCutoff / 60)}h ${caffeine.minutesUntilCutoff % 60}m`
              : 'Zalecana woda / zioła'}
          </span>
        </div>

        {/* Consumed / Active Now */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Spożyto / Aktywna
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight">{caffeine.totalConsumedMg}</span>
            <span className="text-3xs text-text-muted">/ {caffeine.activeCurrentMg} mg</span>
          </div>
          <span className="mt-1 block text-3xs text-text-secondary">
            Obecne stężenie w krwi
          </span>
        </div>

        {/* Active at Bedtime */}
        <div className="col-span-2 rounded-xl border border-border-custom/50 bg-surface-2/40 p-3 sm:col-span-1">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Przy pójściu spać
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-xl font-bold tracking-tight ${
                isBedtimeWarning ? 'text-danger' : 'text-text-primary'
              }`}
            >
              ~{caffeine.activeBedtimeMg}
            </span>
            <span className="text-3xs text-text-muted">mg (cel &lt; 25 mg)</span>
          </div>
          <span className="mt-1 block text-3xs text-text-secondary">
            {caffeine.activeBedtimeMg < 25 ? 'Czyste receptory adenozyny' : 'Zaburzona architektura SWS'}
          </span>
        </div>
      </div>

      {/* Rekomendacja */}
      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-2xs leading-relaxed">{caffeine.recommendation}</p>
      </div>

      {/* Fueling Energy Section (if available) */}
      {fueling && (
        <div className="border-t border-border-custom/30 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-warning" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                Dynamiczne Paliwo (Fueling Target)
              </span>
            </div>
            <span className="text-3xs font-bold text-text-secondary">
              {fueling.fuelingPercentage}% celu
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-text-primary">
                {fueling.consumedCalories} / {fueling.dynamicTargetCalories} kcal
              </span>
              <span
                className={`text-2xs font-medium ${
                  fueling.remainingCalories >= 0 ? 'text-success' : 'text-warning'
                }`}
              >
                {fueling.remainingCalories >= 0
                  ? `Pozostało ${fueling.remainingCalories} kcal`
                  : `Nadwyżka +${Math.abs(fueling.remainingCalories)} kcal`}
              </span>
            </div>

            {/* Pasek postępu */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${Math.min(100, fueling.fuelingPercentage)}%` }}
              />
            </div>

            <div className="flex justify-between text-3xs text-text-muted">
              <span>Baza: {fueling.burnBreakdown.base} kcal</span>
              <span>Aktywny wydatek: +{fueling.burnBreakdown.active} kcal</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
