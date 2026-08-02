import type { FunctionalAgeProfile, HealthspanPace } from '@vanguard/domain';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { HealthspanToday } from '../../../lib/healthspanProjection';

export default function HealthspanPulseCard({
  profile,
  pace,
  today,
}: {
  profile: FunctionalAgeProfile;
  pace: HealthspanPace;
  today?: HealthspanToday;
}) {
  const opportunity = profile.contributors.find((item) => item.direction === 'opportunity');
  return (
    <Card padding="1rem" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-primary">
          <Sparkles size={12} /> Healthspan
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-light tracking-tight text-text-primary">
            {profile.ageRange.low}–{profile.ageRange.high}
          </span>
          <span className="text-xs text-text-muted">wiek funkcjonalny</span>
        </div>
        {opportunity && (
          <p className="mt-1 truncate text-xs text-text-secondary">
            Największa szansa: <strong className="text-text-primary">{opportunity.label}</strong>
          </p>
        )}
      </div>
      <div className="rounded-xl bg-surface-2 px-3 py-2">
        <p className="flex items-center gap-1 text-3xs font-bold uppercase text-text-muted">
          <Activity size={11} /> Tempo
        </p>
        <p className="mt-0.5 text-sm font-black text-text-primary">
          {pace.multiplier == null ? 'Kalibracja' : `${pace.multiplier.toFixed(2)}×`}
        </p>
      </div>
      {today?.capacity.score != null && (
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <p className="text-3xs font-bold uppercase text-text-muted">Pojemność</p>
          <p className="mt-0.5 text-sm font-black text-text-primary">{today.capacity.score}/100</p>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-3xs text-text-muted sm:justify-end">
        <ShieldCheck size={12} /> {profile.confidence.overall}% pewności
      </div>
    </Card>
  );
}
