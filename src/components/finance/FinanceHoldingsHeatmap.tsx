import { useMemo } from 'react';
import { layoutTreemap, type ValuedHolding } from '@vanguard/domain';
import { FinanceEmpty, FinanceSection } from './financeUi';

interface FinanceHoldingsHeatmapProps {
  holdings: ValuedHolding[];
  loading: boolean;
}

const FULL_INTENSITY_PCT = 2;

function formatChange(value: number | null): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace('.', ',')}%`;
}

function tileColor(change: number | null): string {
  if (change == null || change === 0) return 'var(--color-surface-2)';
  const strength = Math.min(1, Math.abs(change) / FULL_INTENSITY_PCT);
  const token = change > 0 ? 'var(--color-success)' : 'var(--color-danger)';
  return `color-mix(in srgb, ${token} ${Math.round(18 + strength * 42)}%, var(--color-surface-1))`;
}

export function FinanceHoldingsHeatmap({ holdings, loading }: FinanceHoldingsHeatmapProps) {
  const rects = useMemo(
    () => layoutTreemap(holdings.map((item) => ({ id: item.id, value: item.valuePln })), 100, 100),
    [holdings],
  );
  const byId = useMemo(() => new Map(holdings.map((item) => [item.id, item])), [holdings]);

  return (
    <FinanceSection title="Mapa cieplna dnia" subtitle="Wielkość kafelka to wartość pozycji, kolor to zmiana dzienna.">
      {holdings.length === 0 ? (
        <FinanceEmpty>Dodaj pozycje w zakładce Portfel, a zobaczysz tu swoje akcje i ETF-y.</FinanceEmpty>
      ) : (
        <div
          className="relative aspect-[4/3] w-full sm:aspect-[16/9]"
          role="list"
          aria-label="Pozycje portfela według wartości i zmiany dziennej"
          aria-busy={loading}
        >
          {rects.map((rect) => {
            const item = byId.get(rect.id);
            if (!item) return null;
            const small = rect.w * rect.h < 450;
            return (
              <div
                key={rect.id}
                role="listitem"
                title={`${item.name}: ${formatChange(item.dayChangePct)}`}
                className="absolute overflow-hidden rounded-lg p-1.5 ring-1 ring-surface-1"
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.w}%`,
                  height: `${rect.h}%`,
                  background: tileColor(item.dayChangePct),
                }}
              >
                <p className="truncate text-xs font-semibold text-text-primary">{item.ticker.replace(/\.(WA|DE|L|AS)$/, '')}</p>
                {!small && (
                  <p className="text-xs tabular-nums text-text-secondary">{formatChange(item.dayChangePct)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FinanceSection>
  );
}
