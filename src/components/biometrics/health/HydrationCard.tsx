/**
 * @file HydrationCard.tsx
 * @role Karta dynamicznego nawodnienia i kompensacji potu (Hydration & Sweat Loss) w stylu Bevel Health.
 * Śledzi realizację celu płynów, automatycznie powiększanego o ubytek potu z treningów i Strainu.
 */

import { useState } from 'react';
import { Droplet, Plus, Sparkles, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { type HydrationResult } from '@vanguard/domain';

interface HydrationCardProps {
  initialData: HydrationResult;
  date?: string;
  onAddWater?: (amountMl: number) => void;
}

export function HydrationCard({ initialData, date, onAddWater }: HydrationCardProps) {
  const storageKey = `sparky_hydration_${date || 'today'}`;
  const [loggedIntake, setLoggedIntake] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && !isNaN(Number(saved))) return Number(saved);
      } catch {
        // fallback
      }
    }
    return initialData.loggedIntakeMl;
  });

  const dynamicTarget = initialData.dynamicTargetMl;
  const percentage = dynamicTarget > 0 ? Math.round((loggedIntake / dynamicTarget) * 100) : 0;
  const remaining = Math.max(0, dynamicTarget - loggedIntake);

  const handleQuickAdd = (deltaMl: number) => {
    const updated = loggedIntake + deltaMl;
    setLoggedIntake(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, String(updated));
      } catch {
        // ignore
      }
    }
    onAddWater?.(deltaMl);
  };

  const getStatusBadge = () => {
    if (initialData.status === 'dehydration_risk') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-danger">
          <AlertTriangle size={10} /> Ryzyko odwodnienia
        </span>
      );
    }
    if (percentage >= 95) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
          <CheckCircle2 size={10} /> Cel zrealizowany
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-primary">
        W trakcie ({percentage}%)
      </span>
    );
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Droplet size={16} className="text-info" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Nawodnienie & Kompensacja Potu</h3>
            <p className="text-3xs text-text-muted">Dynamiczny cel płynów wg obciążenia sesji</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Wykres postępu i główne wartości */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight">{loggedIntake}</span>
            <span className="text-xs font-semibold text-text-muted">/ {dynamicTarget} ml</span>
          </div>
          <span
            className={`text-xs font-bold ${
              remaining === 0 ? 'text-success' : 'text-text-secondary'
            }`}
          >
            {remaining > 0 ? `Pozostało ${remaining} ml` : 'Cel osiągnięty!'}
          </span>
        </div>

        {/* Pasek postępu */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full transition-all ${
              percentage >= 100 ? 'bg-success' : 'bg-info'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* Rozbicie celu: Baza + Pot */}
      <div className="grid grid-cols-2 gap-2 text-2xs">
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-2.5">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Cel bazowy
          </span>
          <p className="mt-0.5 text-sm font-bold text-text-primary">
            {initialData.baseTargetMl} ml
          </p>
          <span className="text-3xs text-text-secondary">Zapotrzebowanie spoczynkowe</span>
        </div>

        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-2.5">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Ubytek potu (Trening)
          </span>
          <p className="mt-0.5 text-sm font-bold text-info">
            +{initialData.sweatLossMl} ml
          </p>
          <span className="text-3xs text-text-secondary">Kompensacja wydatku i Strainu</span>
        </div>
      </div>

      {/* Szybkie przyciski dodawania wody */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border-custom/30 bg-surface-2/20 p-2.5">
        <span className="text-2xs font-semibold text-text-secondary">Szybkie logowanie:</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd(250)}
            className="!h-7 !px-2 !text-3xs"
            aria-label="Dodaj 250 ml"
          >
            <Plus size={10} /> 250 ml
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd(500)}
            className="!h-7 !px-2 !text-3xs"
            aria-label="Dodaj 500 ml"
          >
            <Plus size={10} /> 500 ml
          </Button>
        </div>
      </div>

      {/* Alert elektrolitowy jeśli ubytek potu jest duży */}
      {initialData.needsElectrolytes && initialData.electrolyteAdvisory && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <Zap size={14} className="mt-0.5 shrink-0" />
          <p className="text-2xs leading-relaxed">{initialData.electrolyteAdvisory}</p>
        </div>
      )}

      {/* Rekomendacja */}
      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-2xs leading-relaxed">{initialData.recommendation}</p>
      </div>
    </Card>
  );
}
