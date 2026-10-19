import { Coffee } from 'lucide-react';
import { MIN_NIGHTS_PER_GROUP, type IntakeInsights, type NightGroup } from '../../../lib/biometrics/ouraIntakeInsights';
import { Progress } from './OuraIntakeParts';

interface DivergingBarProps {
  label: string;
  delta: number | null;
  /** Odchylenie, przy którym słupek sięga krawędzi. */
  scale: number;
  unit: string;
  /** Czy wyższa wartość jest korzystna (wynik snu, HRV) czy niższa (zasypianie). */
  higherIsBetter: boolean;
}

function DivergingBar({ label, delta, scale, unit, higherIsBetter }: DivergingBarProps) {
  const pct = delta == null ? 0 : Math.min(Math.abs(delta) / scale, 1) * 50;
  const startPct = delta != null && delta < 0 ? 50 - pct : 50;
  const good = delta != null && (higherIsBetter ? delta > 0 : delta < 0);
  const text = delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}${unit}`;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-text-secondary">{label}</span>
      <div role="img" aria-label={`${label}: ${text}`} className="relative h-2 flex-1 rounded-full bg-surface-3">
        <span className="absolute left-1/2 top-0 h-2 w-px bg-text-muted" />
        {pct > 0 && (
          <span
            className={`absolute top-0 h-2 rounded-full ${good ? 'bg-success' : 'bg-danger'}`}
            style={{ left: `${startPct}%`, width: `${pct}%` }}
          />
        )}
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-text-primary">{text}</span>
    </div>
  );
}

function diff(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : Math.round((a - b) * 10) / 10;
}

function ImpactRow({ hours, comparison }: { hours: number; comparison: IntakeInsights['caffeine']['thresholds'][number]['comparison'] }) {
  const title = `Kawa ${hours} h lub mniej przed snem`;
  if (comparison.status === 'insufficient') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-primary">{title}</p>
        <p className="text-xs text-text-muted">Za mało danych</p>
        <Progress label={`Noce z taką kawą: ${comparison.nWith} z ${MIN_NIGHTS_PER_GROUP} potrzebnych`} value={comparison.nWith} />
        <Progress label={`Noce z kawą wcześniej: ${comparison.nWithout} z ${MIN_NIGHTS_PER_GROUP} potrzebnych`} value={comparison.nWithout} />
      </div>
    );
  }
  const near: NightGroup = comparison.withGroup;
  const far: NightGroup = comparison.withoutGroup;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-text-primary">{title}</p>
        <p className="text-xs text-text-muted">n={near.n} vs n={far.n} · korelacja, nie dowód</p>
      </div>
      <DivergingBar label="Wynik snu" delta={diff(near.sleepScore, far.sleepScore)} scale={15} unit="" higherIsBetter />
      <DivergingBar label="HRV" delta={diff(near.hrv, far.hrv)} scale={15} unit=" ms" higherIsBetter />
      <DivergingBar label="Zasypianie" delta={diff(near.latencyMin, far.latencyMin)} scale={20} unit=" min" higherIsBetter={false} />
    </div>
  );
}

/** Styl "Impacts": odchylenie od zera dla nocy z kawą blisko snu względem nocy z kawą wcześniej. */
export function CaffeineImpacts({ caffeine }: { caffeine: IntakeInsights['caffeine'] }) {
  return (
    <article className="space-y-4 rounded-xl border border-border-custom bg-surface-2 p-5">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Coffee size={16} strokeWidth={1.8} className="text-warning" /> Kawa a noc (odstęp od ostatniej kawy do snu)
        </div>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          Słupek pokazuje różnicę: noce z kawą blisko snu minus noce z kawą wcześniej. {caffeine.nightsWithGap} nocy ma znany odstęp.
        </p>
      </div>
      {caffeine.thresholds.map((t) => <ImpactRow key={t.thresholdHours} hours={t.thresholdHours} comparison={t.comparison} />)}
    </article>
  );
}
