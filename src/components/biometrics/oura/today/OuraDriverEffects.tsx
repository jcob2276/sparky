import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  EffectDirection, EvidenceStrength, SleepToTop5Effect, UseSleepDriversResult,
} from '../../../../lib/biometrics/sleepDrivers/types';
import { DRIVER_META } from '../../../../lib/biometrics/sleepDrivers/meta';
import DataStateNotice from '../../../core/DataStateNotice';
import Button from '../../../ui/Button';
import Skeleton from '../../../ui/Skeleton';
import { OuraEvidenceBadge } from '../shared/OuraEvidenceBadge';
import { OuraSectionHeader } from '../shared/OuraSectionHeader';
import { pickTopEffects } from './pickTopEffects';

function DirectionIcon({ direction }: { direction: EffectDirection }) {
  if (direction === 'helps') return <TrendingUp size={16} className="text-success" aria-label="Pomaga" role="img" />;
  if (direction === 'hurts') return <TrendingDown size={16} className="text-warning" aria-label="Szkodzi" role="img" />;
  return null;
}

function EffectCard({ headline, direction, strength, n, caption }: {
  headline: string; direction: EffectDirection; strength: EvidenceStrength; n: number; caption?: string;
}) {
  return (
    <li className="rounded-xl border border-border-custom/40 bg-surface-1 p-4">
      {caption && <p className="mb-1.5 text-xs text-text-muted">{caption}</p>}
      <div className="flex items-start gap-2.5">
        <span className="mt-1 shrink-0"><DirectionIcon direction={direction} /></span>
        <p className="text-sm leading-6 text-text-primary">{headline}</p>
      </div>
      <div className="mt-2.5"><OuraEvidenceBadge strength={strength} n={n} /></div>
    </li>
  );
}

function emptyDetail(drivers: UseSleepDriversResult): string {
  const data = drivers.data;
  const notes = (data?.coverage ?? [])
    .flatMap(c => (c.note ? [`${DRIVER_META[c.driver].label}: ${c.note}`] : []))
    .slice(0, 2);
  const base = data && data.nightsAnalyzed > 0
    ? `Przeanalizowano ${data.nightsAnalyzed} nocy, ale żadna zależność nie ma jeszcze dość dowodów.`
    : 'Za mało nocy, żeby wskazać zależności.';
  return [base, ...notes].join(' ');
}

interface OuraDriverEffectsProps {
  drivers: UseSleepDriversResult;
  onOpenDrivers: () => void;
}

/** "Co wpływa na Twój sen": top effects from the engine plus one "sleep → Top 5" card. Read-only. */
export function OuraDriverEffects({ drivers, onOpenDrivers }: OuraDriverEffectsProps) {
  const { data, isLoading, error } = drivers;
  const effects = pickTopEffects([...(data?.effects ?? [])]);
  const top5: SleepToTop5Effect | undefined = data?.top5Effects[0];
  let body;
  if (isLoading && !data) {
    body = <div aria-busy="true" aria-label="Liczę zależności"><Skeleton variant="card" lines={3} /></div>;
  } else if (error) {
    body = <DataStateNotice tone="warning" title="Nie udało się policzyć zależności" detail={error.message} />;
  } else if (effects.length === 0 && !top5) {
    body = <DataStateNotice title="Jeszcze nic pewnego" detail={emptyDetail(drivers)} />;
  } else {
    body = (
      <ul className="space-y-2">
        {effects.map(e => <EffectCard key={e.id} headline={e.headline} direction={e.direction} strength={e.strength} n={e.n} />)}
        {effects.length === 0 && <li><DataStateNotice title="Czynniki wieczorne: jeszcze nic pewnego" detail={emptyDetail(drivers)} /></li>}
        {top5 && <EffectCard caption="Sen → Twoja piątka" headline={top5.headline} direction={top5.direction} strength={top5.strength} n={top5.n} />}
      </ul>
    );
  }
  return (
    <section className="space-y-4" aria-labelledby="oura-effects-title">
      <OuraSectionHeader id="oura-effects-title" title="Co wpływa na Twój sen"
        subtitle="Zależności z Twoich nocy. To powtarzalność w danych, nie dowód przyczyny." />
      {body}
      <Button variant="ghost" size="sm" onClick={onOpenDrivers} icon={<ArrowRight size={16} />} iconPosition="right" className="!px-1">
        Wszystkie zależności
      </Button>
    </section>
  );
}
