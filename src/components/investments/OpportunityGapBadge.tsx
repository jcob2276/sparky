import { FC } from 'react';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  entryPrice?: number | null;
  currentPrice?: number | null;
  actorName?: string;
  className?: string;
  compact?: boolean;
}

export const OpportunityGapBadge: FC<Props> = ({
  entryPrice,
  currentPrice,
  actorName,
  className = '',
  compact = false,
}) => {
  if (!entryPrice || !currentPrice || entryPrice <= 0 || currentPrice <= 0) {
    return null;
  }

  const deltaPct = ((currentPrice - entryPrice) / entryPrice) * 100;
  const isCheaper = deltaPct < 0;
  const isModerate = deltaPct >= 0 && deltaPct <= 12;
  const isExtended = deltaPct > 12;

  const actorLabel = actorName ? ` niż ${actorName}` : '';

  if (isCheaper) {
    const discountAbs = Math.abs(deltaPct).toFixed(1);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-bold bg-success/15 text-success border border-success/30 ${className}`}
        title={`Kupujesz po $${currentPrice.toFixed(2)} zamiast $${entryPrice.toFixed(2)} (${discountAbs}% taniej)`}
      >
        <Target size={11} className="shrink-0" />
        <span>
          {compact ? `-${discountAbs}%` : `Kupujesz -${discountAbs}% taniej${actorLabel}`}
        </span>
      </span>
    );
  }

  if (isModerate) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-primary/10 text-primary border border-primary/20 ${className}`}
        title={`Kurs w pobliżu ceny wejścia ($${entryPrice.toFixed(2)} -> $${currentPrice.toFixed(2)})`}
      >
        <TrendingUp size={11} className="shrink-0" />
        <span>
          {compact ? `+${deltaPct.toFixed(1)}%` : `W strefie wejścia (+${deltaPct.toFixed(1)}%)`}
        </span>
      </span>
    );
  }

  if (isExtended) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-medium bg-warning/15 text-warning border border-warning/30 ${className}`}
        title={`Kurs wzrósł o ${deltaPct.toFixed(1)}% od ujawnionej transakcji`}
      >
        <AlertTriangle size={11} className="shrink-0" />
        <span>
          {compact ? `+${deltaPct.toFixed(1)}%` : `Kurs +${deltaPct.toFixed(1)}% od zakupu`}
        </span>
      </span>
    );
  }

  return null;
};
