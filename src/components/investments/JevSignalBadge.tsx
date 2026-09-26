import { FC } from 'react';
import type { JevSignalEvaluation } from '../../lib/investments/jevInvestmentClient';
import { Zap, Shield, Clock, TrendingUp, Cpu } from 'lucide-react';

interface Props {
  evaluation: JevSignalEvaluation;
}

export const JevSignalBadge: FC<Props> = ({ evaluation }) => {
  const { signalScore, rallyProbability, riskLevel, urgency, confidence } = evaluation;

  const riskBadgeColor =
    riskLevel === 'niski'
      ? 'text-success bg-success/10 border-success/30'
      : riskLevel === 'wysoki'
      ? 'text-danger bg-danger/10 border-danger/30'
      : 'text-warning bg-warning/10 border-warning/30';

  const urgencyBadgeColor =
    urgency === 'natychmiastowe'
      ? 'text-primary bg-primary/15 border-primary/40 font-bold'
      : urgency === 'brak'
      ? 'text-text-muted bg-surface-2 border-border-custom'
      : 'text-text-secondary bg-surface-elevated border-border-custom';

  return (
    <div className="rounded-2xl border border-border-custom bg-surface-elevated/40 p-3.5 sm:p-4 shadow-2xs space-y-3 mb-4 backdrop-blur-xs">
      {/* Header with Jev identity */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Zap size={14} className="fill-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs text-text-primary tracking-tight">
              TypeSafe Jev
            </span>
            <span className="px-1.5 py-0.2 rounded-md font-mono text-4xs uppercase bg-primary/15 text-primary border border-primary/20 font-black">
              System 1
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-3xs font-mono text-text-muted">
          <span className="flex items-center gap-1">
            <Cpu size={12} className="text-text-muted" />
            <span>Pewność: {Math.round(confidence * 100)}%</span>
          </span>
          <span>•</span>
          <span className="text-primary font-semibold">Decyzja probabilistyczna</span>
        </div>
      </div>

      {/* Grid of Probabilistic Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Siła sygnału */}
        <div className="p-2.5 rounded-xl bg-surface border border-border-custom/70 flex flex-col justify-between">
          <div className="text-3xs font-mono text-text-muted flex items-center gap-1">
            <span>Siła sygnału</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-black font-mono text-text-primary">
              {signalScore.toFixed(1)}
            </span>
            <span className="text-3xs font-mono text-text-muted">/ 5.0</span>
          </div>
        </div>

        {/* 2. Prawdopodobieństwo rajdu */}
        <div className="p-2.5 rounded-xl bg-surface border border-border-custom/70 flex flex-col justify-between">
          <div className="text-3xs font-mono text-text-muted flex items-center gap-1">
            <TrendingUp size={11} className="text-success" />
            <span>Szansa rajdu (30-90d)</span>
          </div>
          <div className="mt-1">
            <span
              className={`text-base font-black font-mono ${
                rallyProbability >= 65
                  ? 'text-success'
                  : rallyProbability >= 45
                  ? 'text-warning'
                  : 'text-text-secondary'
              }`}
            >
              {rallyProbability}%
            </span>
          </div>
        </div>

        {/* 3. Poziom ryzyka */}
        <div className="p-2.5 rounded-xl bg-surface border border-border-custom/70 flex flex-col justify-between">
          <div className="text-3xs font-mono text-text-muted flex items-center gap-1">
            <Shield size={11} className="text-text-muted" />
            <span>Ryzyko / Asymetria</span>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded-md font-mono text-3xs border capitalize ${riskBadgeColor}`}
            >
              {riskLevel}
            </span>
          </div>
        </div>

        {/* 4. Pilność timingowa */}
        <div className="p-2.5 rounded-xl bg-surface border border-border-custom/70 flex flex-col justify-between">
          <div className="text-3xs font-mono text-text-muted flex items-center gap-1">
            <Clock size={11} className="text-text-muted" />
            <span>Pilność reakcji</span>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded-md font-mono text-3xs border capitalize ${urgencyBadgeColor}`}
            >
              {urgency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
