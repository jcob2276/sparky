import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { DriverEffect, EffectDirection } from '../../../../lib/biometrics/sleepDrivers/types';
import { OuraEvidenceBadge } from '../shared/OuraEvidenceBadge';
import { DIRECTION_LABEL, describeRho, type DriverGroup } from './driverGroups';
import { DRIVER_META, OUTCOME_META, capitalize } from './driverMeta';
import { SplitBars } from './SplitBars';

const DIRECTION_VIEW: Record<EffectDirection, { icon: typeof Minus; tone: string }> = {
  helps: { icon: ArrowUpRight, tone: 'text-success' },
  hurts: { icon: ArrowDownRight, tone: 'text-warning' },
  unclear: { icon: Minus, tone: 'text-text-muted' },
};

function EffectRow({ effect }: { effect: DriverEffect }) {
  const outcome = OUTCOME_META[effect.outcome];
  const view = DIRECTION_VIEW[effect.direction];
  const Icon = view.icon;
  return (
    <li className="space-y-2 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text-primary">{capitalize(outcome.label)}</h4>
        <OuraEvidenceBadge strength={effect.strength} n={effect.n} />
      </div>
      <p className="text-sm leading-6 text-text-secondary">{effect.headline}</p>
      <p className={`flex items-center gap-1 text-xs font-semibold ${view.tone}`}>
        <Icon size={14} aria-hidden="true" /> {DIRECTION_LABEL[effect.direction]}
        {!effect.split && <span className="font-normal text-text-muted">· {describeRho(effect.rho)}</span>}
      </p>
      {effect.split && (
        <SplitBars split={effect.split} unit={outcome.unit} outcomeLabel={outcome.label} direction={effect.direction} />
      )}
    </li>
  );
}

/** Karta jednego czynnika: wszystkie jego efekty na wyniki snu. */
export function DriverCard({ group }: { group: DriverGroup }) {
  const meta = DRIVER_META[group.driver];
  return (
    <article className="space-y-3 rounded-xl border border-white/5 bg-surface-2 p-4 sm:p-5" aria-label={meta.label}>
      <header>
        <h3 className="text-lg font-light text-text-primary">{meta.label}</h3>
        <p className="text-xs text-text-muted">{meta.hint}</p>
      </header>
      <ul className="space-y-3">
        {group.effects.map((effect) => <EffectRow key={effect.id} effect={effect} />)}
      </ul>
    </article>
  );
}
