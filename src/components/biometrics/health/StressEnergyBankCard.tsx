import { Activity } from 'lucide-react';
import DataStateNotice from '../../core/DataStateNotice';

interface StressEnergyBankCardProps {
  input: {
    recoveryScore?: number | null;
    stressScore?: number | null;
    stressHighMinutes?: number | null;
    recoveryHighMinutes?: number | null;
  };
  lastUpdatedFormatted?: string;
}

export function StressEnergyBankCard({ input, lastUpdatedFormatted }: StressEnergyBankCardProps) {
  const metrics = [
    { label: 'Wynik stresu Oura', value: input.stressScore, unit: '/100' },
    { label: 'Wysoki stres', value: input.stressHighMinutes, unit: ' min' },
    { label: 'Czas regeneracji', value: input.recoveryHighMinutes, unit: ' min' },
    { label: 'Gotowość Oura', value: input.recoveryScore, unit: '/100' },
  ].map((metric) => ({ ...metric, value: metric.value != null && Number.isFinite(metric.value) && metric.value >= 0 ? metric.value : null }));

  return (
    <section className="rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Activity size={18} className="text-text-secondary" /> Stres i regeneracja
        </h3>
        {lastUpdatedFormatted && <span className="text-xs text-text-muted">Oura · {lastUpdatedFormatted}</span>}
      </div>
      {metrics.every((metric) => metric.value == null) ? (
        <DataStateNotice title="Brak pomiarów stresu i regeneracji" detail="Oura nie przekazała wyników ani czasu stresu i regeneracji dla tego dnia." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3">
              <span className="block text-3xs text-text-muted">{metric.label}</span>
              <span className="text-lg font-bold text-text-primary">{metric.value == null ? '—' : `${metric.value}${metric.unit}`}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
