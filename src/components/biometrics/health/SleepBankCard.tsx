/**
 * @file SleepBankCard.tsx
 * @role Karta Banku Snu (Sleep Bank) oraz trajektorii spłaty długu w stylu Bevel Health.
 * Prezentuje skumulowany 14-dniowy bilans snu, wpływ drzemek oraz optymalne wydłużenie snu.
 */

import { Moon, TrendingDown, TrendingUp, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { type SleepBankResult } from '@vanguard/domain';

interface SleepBankCardProps {
  data: SleepBankResult;
}

export function SleepBankCard({ data }: SleepBankCardProps) {
  if (!data) return null;

  const isDebt = data.totalDebtMinutes < 0;
  const isSevere = data.status === 'severe_debt';

  const getStatusBadge = () => {
    if (isSevere) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-danger">
          <AlertCircle size={10} /> {data.statusLabel}
        </span>
      );
    }
    if (isDebt) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
          <TrendingDown size={10} /> {data.statusLabel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
        {data.totalDebtMinutes > 60 ? <TrendingUp size={10} /> : <CheckCircle2 size={10} />} {data.statusLabel}
      </span>
    );
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Moon size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Bank Snu (Sleep Bank)</h3>
            <p className="text-3xs text-text-muted">Skumulowany bilans regeneracyjny z 14 dni</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Główne metryki */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Bilans długu/nadwyżki */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Bilans netto
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-2xl font-black tracking-tight ${
                isDebt ? (isSevere ? 'text-danger' : 'text-warning') : 'text-success'
              }`}
            >
              {data.totalDebtHours > 0 ? `+${data.totalDebtHours}` : data.totalDebtHours}
            </span>
            <span className="text-xs font-bold text-text-muted">godz.</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">
            {isDebt ? `${Math.abs(data.totalDebtMinutes)} min deficytu` : 'Pełna rezerwa'}
          </span>
        </div>

        {/* Średni sen vs zapotrzebowanie */}
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Średni sen / cel
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight">
              {(data.rolling14DaysAverageSleepMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-3xs text-text-muted">
              / {(data.rolling14DaysAverageNeedMinutes / 60).toFixed(1)}h
            </span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">Średnia z 14 nocy</span>
        </div>

        {/* Rekomendacja spłaty */}
        <div className="col-span-2 rounded-xl border border-border-custom/50 bg-surface-2/40 p-3 sm:col-span-1">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Plan spłaty długu
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            {isDebt ? (
              <>
                <span className="text-xl font-bold tracking-tight text-primary">
                  +{data.recommendedNightlyExtensionMinutes}m
                </span>
                <span className="text-3xs text-text-muted">/ noc ({data.estimatedDaysToFullPayback} dni)</span>
              </>
            ) : (
              <span className="text-base font-bold tracking-tight text-success">
                Utrzymuj harmonogram
              </span>
            )}
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">
            {isDebt ? 'Bezpieczna korekta rytmu' : 'Zoptymalizowany czas snu'}
          </span>
        </div>
      </div>

      {/* Mini wykres bilansu ostatnich dni */}
      {data.recentDaysBreakdown.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border-custom/30 bg-surface-2/20 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Ostatnie doby (Deficyt / Nadwyżka)
          </span>
          <div className="flex h-12 items-end justify-between gap-1 pt-2">
            {data.recentDaysBreakdown.slice(-7).map((day) => {
              const isPositive = day.balanceMinutes >= 0;
              const barHeightPct = Math.min(100, Math.max(15, (Math.abs(day.balanceMinutes) / 120) * 100));
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-8 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-3 rounded-t-sm transition-all ${
                        isPositive ? 'bg-success/80' : 'bg-warning/80'
                      }`}
                      style={{ height: `${barHeightPct}%` }}
                      title={`${day.date}: ${isPositive ? '+' : ''}${day.balanceMinutes}m`}
                    />
                  </div>
                  <span className="text-3xs font-medium text-text-muted">
                    {day.date.slice(8, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Podsumowanie i rekomendacja */}
      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-2xs leading-relaxed">{data.recommendation}</p>
      </div>
    </Card>
  );
}
