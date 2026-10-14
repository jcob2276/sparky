import { useMemo } from 'react';
import { BookOpen, HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';
import type { CorrelationsData } from '../../../lib/correlationsApi';

interface HabitImpactCardProps {
  correlations: CorrelationsData | null | undefined;
}

const BEHAVIOR_NAMES: Record<string, { name: string; category: string }> = {
  sauna: { name: 'Sauna', category: 'Regeneracja' },
  cold_exposure: { name: 'Morsowanie / zimny prysznic', category: 'Regeneracja' },
  alcohol: { name: 'Alkohol', category: 'Styl życia' },
  late_meal: { name: 'Późna kolacja (<2h przed snem)', category: 'Żywienie' },
  caffeine_late: { name: 'Kofeina po 14:00', category: 'Kofeina' },
  breathwork: { name: 'Sesja oddechowa / medytacja', category: 'Stres' },
  magnesium: { name: 'Magnez przed snem', category: 'Suplementy' },
  evening_workout: { name: 'Intensywny trening wieczorny', category: 'Trening' },
};

const METRIC_NAMES: Record<string, string> = {
  hrv: 'HRV',
  sleep_average_hrv: 'HRV',
  readiness_score: 'Gotowość',
  recovery_score: 'Gotowość',
  deep_sleep_hours: 'Głęboki sen',
  sleep_score: 'Wynik snu',
};

const CONFIDENCE_BADGES: Record<string, { label: string; class: string }> = {
  solid: { label: 'Solidne dane', class: 'bg-success/15 text-success border-success/30' },
  building: { label: 'Budowanie bazy', class: 'bg-primary/15 text-primary border-primary/30' },
  calibrating: { label: 'Kalibracja', class: 'bg-surface-2 text-text-muted border-border-custom' },
};

export function HabitImpactCard({ correlations }: HabitImpactCardProps) {
  const displayList = useMemo(() => {
    const list = correlations?.behaviors ?? [];
    return list
      .filter((b) => b.pct_change != null && Math.abs(b.pct_change) > 0.5)
      .sort((a, b) => Math.abs(b.pct_change || 0) - Math.abs(a.pct_change || 0));
  }, [correlations?.behaviors]);

  return (
    <section className="rounded-2xl border border-border-custom/40 bg-surface-1 p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom/40 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Nawyki a regeneracja
            </h3>
            <p className="text-2xs text-text-muted">
              Zależności obserwowane w Twoich zapisach snu i HRV
            </p>
          </div>
        </div>

        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-2xs font-medium text-text-secondary border border-border-custom/40">
          {displayList.length} wykrytych nawyków
        </span>
      </div>

      {displayList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-custom/60 p-5 text-center space-y-1.5">
          <p className="text-xs font-medium text-text-primary">Zbieranie korelacji nawyków</p>
          <p className="text-2xs text-text-muted max-w-sm mx-auto">
            Zapisuj faktyczne zachowania i odczucia. Do porównania potrzebne są dni z danym zachowaniem i bez niego oraz pomiary wyników w obu grupach.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((item) => {
            const info = BEHAVIOR_NAMES[item.behavior_key] ?? {
              name: item.behavior_key,
              category: 'Zachowanie',
            };
            const metricLabel = METRIC_NAMES[item.outcome_metric] ?? item.outcome_metric;
            const pct = item.pct_change ?? 0;
            const isPositive = pct > 0;
            const conf = CONFIDENCE_BADGES[item.confidence] ?? CONFIDENCE_BADGES.calibrating;

            return (
              <div
                key={`${item.behavior_key}_${item.outcome_metric}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-custom/40 bg-surface-2 p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">{info.name}</span>
                    <span className="rounded px-1.5 py-0.2 text-3xs font-medium bg-surface-1 text-text-muted">
                      {info.category}
                    </span>
                  </div>
                  <p className="text-2xs text-text-muted">
                    Wynik: <strong className="text-text-secondary">{metricLabel}</strong> · Próba: {item.n_with} dni z nawykiem vs {item.n_without} bez
                  </p>
                </div>

                <div className="flex items-center gap-2.5 text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                    isPositive ? 'text-success' : 'text-danger'
                  }`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPositive ? '+' : ''}{pct.toFixed(1)}%
                  </span>

                  <span className={`rounded-full border px-2 py-0.5 text-3xs font-medium ${conf.class}`}>
                    {conf.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-1.5 text-3xs text-text-muted pt-1 border-t border-border-custom/40">
        <HelpCircle size={12} className="mt-0.5 shrink-0" />
        <p>
          Procent pokazuje różnicę średnich między zapisanymi grupami dni. To zależność, nie dowód wpływu nawyku. Wyniki mogą zależeć także od treningu, choroby, pory pomiaru i innych czynników.
        </p>
      </div>
    </section>
  );
}
