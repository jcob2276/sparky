/**
 * @file CardioDriftCard.tsx
 * @role Karta analizy dryfu tętna i rozprzężenia tlenowego (Cardio Drift / Aerobic Decoupling)
 * w stylu Bevel Health / Joe Friela.
 * Monitoruje stabilność relacji prędkości do tętna w biegach i treningach kardio.
 */

import { Activity, AlertTriangle, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import { type CardioDriftResult } from '@vanguard/domain';

interface CardioDriftCardProps {
  data?: CardioDriftResult | null;
  half1Label?: string;
  half2Label?: string;
}

export function CardioDriftCard({
  data,
  half1Label = '1. połowa sesji',
  half2Label = '2. połowa sesji',
}: CardioDriftCardProps) {
  if (!data || data.efHalf1 === 0 || data.ratingLabel === 'Brak danych') {
    return (
      <Card className="space-y-3 p-4 text-text-primary">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Activity size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Dryf Tętna (Aerobic Decoupling)</h3>
            <p className="text-3xs text-text-muted">Stabilność bazy tlenowej i ekonomii biegu</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border-custom/60 p-4 text-center">
          <p className="text-xs text-text-secondary">Brak pomiarów tempa i tętna dla obu połówek sesji.</p>
          <p className="text-3xs text-text-muted mt-1">Średnie z całego biegu nie wystarczają do obliczenia dryfu.</p>
        </div>
      </Card>
    );
  }
  const getBadge = () => {
    switch (data.rating) {
      case 'optimal_coupling':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
            <CheckCircle2 size={10} /> Pełne sprzężenie
          </span>
        );
      case 'mild_drift':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-primary">
            Lekki dryf
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
            <AlertTriangle size={10} /> Rozprzężenie tlenowe
          </span>
        );
    }
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Activity size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Dryf Tętna (Aerobic Decoupling)</h3>
            <p className="text-3xs text-text-muted">Stabilność bazy tlenowej i ekonomii biegu</p>
          </div>
        </div>
        {getBadge()}
      </div>

      {/* Główne metryki */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Wskaźnik Decoupling */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Rozprzężenie (Pa:Hr)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-2xl font-black tracking-tight ${
                data.hasSignificantDrift ? 'text-warning' : 'text-success'
              }`}
            >
              {data.decouplingPercentage}%
            </span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">
            {data.hasSignificantDrift
              ? 'Norma przekroczona (> 5%)'
              : data.rating === 'mild_drift'
              ? 'Lekki dryf (3.5% - 5%)'
              : 'W normie (< 3.5%)'}
          </span>
        </div>

        {/* Delta HR */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Wzrost tętna (Δ HR)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-xl font-bold tracking-tight ${
                data.hrDeltaBpm > 5 ? 'text-warning' : 'text-text-primary'
              }`}
            >
              {data.hrDeltaBpm > 0 ? `+${data.hrDeltaBpm}` : data.hrDeltaBpm}
            </span>
            <span className="text-xs font-bold text-text-muted">bpm</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">2. połowa vs 1. połowa</span>
        </div>

        {/* Efficiency Factor */}
        <div className="col-span-2 rounded-xl border border-border-custom/50 bg-surface-2/40 p-3 sm:col-span-1">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Współczynnik EF
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold tracking-tight text-text-primary">
              {data.efHalf1}
            </span>
            <span className="text-3xs text-text-muted">→ {data.efHalf2} m/s/bpm</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">Wskaźnik efektywności</span>
        </div>
      </div>

      {/* Porównanie połówek */}
      <div className="rounded-xl border border-border-custom/30 bg-surface-2/20 p-2.5">
        <div className="flex items-center justify-between text-2xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-text-muted" />
            <span>Porównanie obciążenia:</span>
          </div>
          <div className="flex items-center gap-3 text-3xs font-semibold">
            <span className="text-text-muted">{half1Label}</span>
            <span className="text-text-muted">→</span>
            <span className="text-primary">{half2Label}</span>
          </div>
        </div>
      </div>

      {/* Rekomendacja */}
      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        {data.hasSignificantDrift ? (
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        ) : (
          <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        )}
        <p className="text-2xs leading-relaxed">{data.recommendation}</p>
      </div>
    </Card>
  );
}
