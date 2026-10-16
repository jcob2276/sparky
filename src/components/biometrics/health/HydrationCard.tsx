/**
 * @file HydrationCard.tsx
 * @role Karta dynamicznego nawodnienia i kompensacji potu (Hydration & Sweat Loss) w stylu Bevel Health.
 * Śledzi realizację celu płynów, automatycznie powiększanego o ubytek potu z treningów i Strainu.
 */

import { useState, useMemo } from 'react';
import { Droplet, Plus, Sparkles, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { type HydrationResult } from '@vanguard/domain';

interface HydrationCardProps {
  initialData: HydrationResult;
  date?: string;
  userId?: string;
  onAddWater?: (amountMl: number) => void;
}

function getStoredIntake(storageKey: string | null, fallback: number): number {
  if (typeof window === 'undefined' || !storageKey) return fallback;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && Number.isFinite(Number(saved)) && Number(saved) >= 0) return Number(saved);
  } catch {
    // fallback
  }
  return fallback;
}

function HydrationHeader({
  status,
  percentage,
}: {
  status: string;
  percentage: number;
}) {
  const getBadge = () => {
    if (status === 'dehydration_risk') {
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
      {getBadge()}
    </div>
  );
}

function HydrationBreakdown({
  baseTargetMl,
  sweatLossMl,
}: {
  baseTargetMl: number;
  sweatLossMl: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 text-2xs">
      <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-2.5">
        <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
          Cel bazowy
        </span>
        <p className="mt-0.5 text-sm font-bold text-text-primary">{baseTargetMl} ml</p>
        <span className="text-3xs text-text-secondary">Zapotrzebowanie spoczynkowe</span>
      </div>

      <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-2.5">
        <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
          Ubytek potu (Trening)
        </span>
        <p className="mt-0.5 text-sm font-bold text-info">+{sweatLossMl} ml</p>
        <span className="text-3xs text-text-secondary">Kompensacja wydatku i Strainu</span>
      </div>
    </div>
  );
}

export function HydrationCard({ initialData, date, userId, onAddWater }: HydrationCardProps) {
  const storageKey = userId && date ? `sparky_hydration_${userId}_${date}` : null;
  const [prevKey, setPrevKey] = useState(storageKey);
  const [loggedIntake, setLoggedIntake] = useState<number>(() =>
    getStoredIntake(storageKey, initialData.loggedIntakeMl)
  );

  if (storageKey !== prevKey) {
    setPrevKey(storageKey);
    setLoggedIntake(getStoredIntake(storageKey, initialData.loggedIntakeMl));
  }

  const currentResult = useMemo((): HydrationResult => {
    const sweatLoss = initialData.sweatLossMl;
    const baseTarget = initialData.baseTargetMl;
    const dynamicTarget = baseTarget + sweatLoss;
    const remaining = Math.max(0, dynamicTarget - loggedIntake);
    const percentage = dynamicTarget > 0 ? Math.round((loggedIntake / dynamicTarget) * 100) : 0;

    let status: HydrationResult['status'] = 'behind';
    let statusLabel = 'Wymaga uzupełnienia';

    if (sweatLoss >= 800 && loggedIntake < 1200) {
      status = 'dehydration_risk';
      statusLabel = 'Ryzyko odwodnienia';
    } else if (percentage >= 95) {
      status = 'optimal';
      statusLabel = 'Optymalne nawodnienie';
    } else if (percentage >= 60) {
      status = 'on_track';
      statusLabel = 'W normie';
    }

    let recommendation = `Zrealizowano ${percentage}% dziennego celu (${loggedIntake}/${dynamicTarget} ml).`;
    if (status === 'dehydration_risk') {
      recommendation = `Wysokie obciążenie treningowe przy niskiej podaży płynów. Uzupełnij ${remaining} ml wody z elektrolitami, aby zapobiec spadkowi HRV i skurczom.`;
    } else if (status === 'optimal') {
      recommendation = `Świetny bilans płynów (${loggedIntake} ml). Osiągnięto cel z pełną kompensacją strat potreningowych.`;
    } else if (remaining > 0) {
      recommendation = `Pozostało ${remaining} ml do wypicia. Baza: ${baseTarget} ml + kompensacja potu: +${sweatLoss} ml.`;
    }

    return {
      ...initialData,
      loggedIntakeMl: loggedIntake,
      remainingMl: remaining,
      percentage,
      status,
      statusLabel,
      recommendation,
    };
  }, [initialData, loggedIntake]);

  const handleQuickAdd = (deltaMl: number) => {
    const updated = loggedIntake + deltaMl;
    setLoggedIntake(updated);
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.setItem(storageKey, String(updated));
      } catch {
        // ignore
      }
    }
    onAddWater?.(deltaMl);
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      <HydrationHeader status={currentResult.status} percentage={currentResult.percentage} />

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight">{loggedIntake}</span>
            <span className="text-xs font-semibold text-text-muted">/ {currentResult.dynamicTargetMl} ml</span>
          </div>
          <span
            className={`text-xs font-bold ${
              currentResult.remainingMl === 0 ? 'text-success' : 'text-text-secondary'
            }`}
          >
            {currentResult.remainingMl > 0 ? `Pozostało ${currentResult.remainingMl} ml` : 'Cel osiągnięty!'}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full transition-all ${
              currentResult.percentage >= 100 ? 'bg-success' : 'bg-info'
            }`}
            style={{ width: `${Math.min(100, currentResult.percentage)}%` }}
          />
        </div>
      </div>

      <HydrationBreakdown
        baseTargetMl={currentResult.baseTargetMl}
        sweatLossMl={currentResult.sweatLossMl}
      />

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

      {currentResult.needsElectrolytes && currentResult.electrolyteAdvisory && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <Zap size={14} className="mt-0.5 shrink-0" />
          <p className="text-2xs leading-relaxed">{currentResult.electrolyteAdvisory}</p>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-2xs leading-relaxed">{currentResult.recommendation}</p>
      </div>
    </Card>
  );
}
