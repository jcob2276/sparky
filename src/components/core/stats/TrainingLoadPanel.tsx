import { useMemo } from 'react';
import { Card } from '../../ui/Card';
import { ACWR_BAND_LABELS } from '@vanguard/domain';
import { buildAcwrFromStrain } from '../../../lib/health/trainingAnalytics';

interface TrainingLoadPanelProps {
  strainRows: Array<{ date: string; strain_score?: number | null }>;
}

export function TrainingLoadPanel({ strainRows }: TrainingLoadPanelProps) {
  const metrics = useMemo(() => buildAcwrFromStrain(strainRows), [strainRows]);

  if (metrics.acwr == null && metrics.acuteLoad == null) {
    return (
      <Card variant="glass" className="border border-border-custom p-5">
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Obciążenie (ACWR)</p>
        <p className="mt-2 text-sm text-text-muted">
          Brak danych strain z ostatnich 4 tygodni — zapisz trening lub poczekaj na sync Oura.
        </p>
      </Card>
    );
  }

  const bandLabel = metrics.band ? ACWR_BAND_LABELS[metrics.band] : '—';
  const bandColor =
    metrics.band === 'spike_risk'
      ? 'text-warning border-warning/30 bg-warning/5'
      : metrics.band === 'elevated'
        ? 'text-warning border-warning/20 bg-warning/5'
        : metrics.band === 'optimal'
          ? 'text-dayC border-dayC/25 bg-dayC/5'
          : 'text-text-secondary border-border-custom bg-surface/40';

  return (
    <Card variant="glass" className="border border-border-custom p-5 space-y-4">
      <div>
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Obciążenie (ACWR)</p>
        <h2 className="mt-1 font-display text-lg font-black tracking-tight text-text-primary">Strain 7d vs 28d</h2>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-2xs text-text-muted">ACWR</p>
          <p className="text-3xl font-black text-text-primary">{metrics.acwr?.toFixed(2) ?? '—'}</p>
        </div>
        <span className={`rounded-xl border px-3 py-1.5 text-2xs font-black uppercase tracking-widest ${bandColor}`}>
          {bandLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-border-custom bg-surface/40 px-3 py-2">
          <p className="text-2xs text-text-muted">Ostre (7d)</p>
          <p className="font-black text-text-primary">{metrics.acuteLoad ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-border-custom bg-surface/40 px-3 py-2">
          <p className="text-2xs text-text-muted">Chroniczne (28d)</p>
          <p className="font-black text-text-primary">{metrics.chronicLoad ?? '—'}</p>
        </div>
        {metrics.monotony != null && (
          <div className="rounded-xl border border-border-custom bg-surface/40 px-3 py-2 col-span-2">
            <p className="text-2xs text-text-muted">Monotonia (7d)</p>
            <p className="font-black text-text-primary">{metrics.monotony}</p>
            <p className="text-2xs text-text-muted mt-0.5">Wysoka = mała zmienność obciążenia</p>
          </div>
        )}
      </div>
    </Card>
  );
}
