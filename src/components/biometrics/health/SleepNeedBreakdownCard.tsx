/**
 * @file SleepNeedBreakdownCard.tsx
 * @role Karta dynamicznego zapotrzebowania na sen (Sleep Need Formula) w stylu Bevel / Whoop.
 */

import { Moon, Plus, Minus, ArrowRight } from 'lucide-react';
import { computeSleepNeed, type SleepNeedInput } from '@vanguard/domain';

interface SleepNeedBreakdownCardProps {
  input: SleepNeedInput;
}

export function SleepNeedBreakdownCard({ input }: SleepNeedBreakdownCardProps) {
  const result = computeSleepNeed(input);
  const {
    baselineFormatted,
    strainExtraMinutes,
    debtExtraMinutes,
    napCreditMinutes,
    targetSleepFormatted,
    explanation,
  } = result;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon size={18} className="text-info" />
          <h3 className="text-sm font-semibold tracking-wide text-text-primary">
            Docelowy Czas Snu (Sleep Need)
          </h3>
        </div>
        <span className="rounded-full bg-info/10 border border-info/25 px-2.5 py-0.5 text-xs font-semibold text-info">
          Cel: {targetSleepFormatted}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3">
          <span className="block text-3xs font-medium text-text-muted">Baza</span>
          <span className="text-base font-bold text-text-primary">{baselineFormatted}</span>
        </div>

        <div className="rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3">
          <span className="flex items-center gap-1 text-3xs font-medium text-warning">
            <Plus size={11} /> Obciążenie
          </span>
          <span className="text-base font-bold text-text-primary">
            +{strainExtraMinutes}m
          </span>
        </div>

        <div className="rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3">
          <span className="flex items-center gap-1 text-3xs font-medium text-danger">
            <Plus size={11} /> Dług senny
          </span>
          <span className="text-base font-bold text-text-primary">
            +{debtExtraMinutes}m
          </span>
        </div>

        <div className="rounded-2xl border border-border-custom/40 bg-surface-2/40 p-3">
          <span className="flex items-center gap-1 text-3xs font-medium text-success">
            <Minus size={11} /> Drzemka
          </span>
          <span className="text-base font-bold text-text-primary">
            -{napCreditMinutes}m
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-surface-2/60 p-3 text-xs text-text-secondary">
        <ArrowRight size={14} className="mt-0.5 shrink-0 text-info" />
        <p className="leading-relaxed">{explanation}</p>
      </div>
    </section>
  );
}
