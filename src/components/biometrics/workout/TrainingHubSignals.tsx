import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { HubForecast, HubNeglect } from '../../../lib/health/hubIntelligence';

interface Props {
  forecasts: HubForecast[];
  neglects: HubNeglect[];
}

/** Evidence-based progression estimates + optional neglect cues. */
export default function TrainingHubSignals({ forecasts, neglects }: Props) {
  if (forecasts.length === 0 && neglects.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {forecasts.length > 0 && (
        <section className="space-y-2" aria-label="Estymaty progresji">
          <div className="flex items-center gap-1.5 px-0.5">
            <TrendingUp size={12} className="text-primary" />
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Trend e1RM
            </span>
          </div>
          <ul className="space-y-1.5">
            {forecasts.map((f) => (
              <li
                key={f.key}
                className="trening-panel-muted rounded-[var(--tren-radius-card)] px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">{f.displayLabel}</span>
                  <span className="text-xs font-black tabular-nums text-primary">
                    {f.deltaPerWeekKg > 0 ? '+' : ''}
                    {f.deltaPerWeekKg} kg/tydz.
                  </span>
                </div>
                <p className="text-3xs text-text-secondary leading-snug mt-1">{f.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {neglects.length > 0 && (
        <section className="space-y-2" aria-label="Zaniedbania">
          <div className="flex items-center gap-1.5 px-0.5">
            <AlertTriangle size={12} className="text-warning" />
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
              Zaniedbania
            </span>
          </div>
          <ul className="space-y-1.5">
            {neglects.map((n) => (
              <li
                key={`${n.tag}-${n.reason}`}
                className="trening-panel-muted rounded-[var(--tren-radius-card)] px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-text-primary">{n.displayLabel}</span>
                  <span className="text-3xs font-bold tabular-nums text-text-tertiary">
                    {n.reason === 'gap' ? `${n.daysSince}d` : `${n.volumeSharePct}% vol`}
                  </span>
                </div>
                <p className="text-3xs text-text-secondary leading-snug mt-1">{n.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
