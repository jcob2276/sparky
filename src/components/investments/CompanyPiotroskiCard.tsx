import { FC, useState } from 'react';
import { getPiotroskiScore, PiotroskiScoreResult, PiotroskiSignal } from '../../lib/investments/piotroskiScore';
import Button from '../ui/Button';
import { ShieldCheck, ChevronDown, ChevronUp, Check, X, Award, Info } from 'lucide-react';

interface Props {
  ticker: string;
}

const PiotroskiCategoryColumn: FC<{
  title: string;
  category: PiotroskiSignal['category'];
  signals: PiotroskiSignal[];
}> = ({ title, category, signals }) => (
  <div className="space-y-2 p-3 rounded-xl bg-surface/50 border border-border-custom/60">
    <div className="text-4xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
      <Info size={10} className="text-primary" />
      <span>{title}</span>
    </div>
    <div className="space-y-1.5">
      {signals
        .filter((s) => s.category === category)
        .map((sig) => (
          <div key={sig.id} className="flex items-start gap-1.5 text-3xs">
            {sig.pass ? (
              <Check size={13} className="text-success shrink-0 mt-0.5" />
            ) : (
              <X size={13} className="text-danger shrink-0 mt-0.5" />
            )}
            <div>
              <div className={sig.pass ? 'text-text-primary font-medium' : 'text-text-muted'}>
                {sig.title}
              </div>
              <div className="text-4xs text-text-muted">{sig.impact}</div>
            </div>
          </div>
        ))}
    </div>
  </div>
);

const PiotroskiSignalsGrid: FC<{ signals: PiotroskiSignal[] }> = ({ signals }) => (
  <div className="pt-2 border-t border-border-custom/50 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
    <PiotroskiCategoryColumn
      title="1. Rentowność i Przepływy"
      category="profitability"
      signals={signals}
    />
    <PiotroskiCategoryColumn
      title="2. Dźwignia Finansowa i Płynność"
      category="leverage"
      signals={signals}
    />
    <PiotroskiCategoryColumn
      title="3. Efektywność i Marże"
      category="efficiency"
      signals={signals}
    />
  </div>
);

export const CompanyPiotroskiCard: FC<Props> = ({ ticker }) => {
  const [expanded, setExpanded] = useState(false);
  const scoreData: PiotroskiScoreResult = getPiotroskiScore(ticker);

  const getTierColor = (tier: PiotroskiScoreResult['tier']) => {
    switch (tier) {
      case 'excellent':
        return 'text-success bg-success/15 border-success/30';
      case 'healthy':
        return 'text-primary bg-primary/15 border-primary/30';
      case 'average':
        return 'text-warning bg-warning/15 border-warning/30';
      case 'risky':
        return 'text-danger bg-danger/15 border-danger/30';
    }
  };

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
                Piotroski F-Score & Jakość Bilansowa
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-4xs font-mono font-bold uppercase border ${getTierColor(
                  scoreData.tier
                )}`}
              >
                {scoreData.badgeLabel}
              </span>
            </div>
            <p className="text-3xs text-text-muted mt-0.5">
              9-punktowy test fundamentalny Josepha Piotroskiego (Stanford) badający rentowność, dług i efektywność.
            </p>
          </div>
        </div>

        {/* Magic Formula Badge */}
        {scoreData.magicFormulaRank !== 'unranked' && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-border-custom text-3xs font-semibold text-text-secondary self-start sm:self-auto">
            <Award size={13} className="text-primary" />
            <span>
              Magic Formula:{' '}
              <strong className="text-text-primary font-mono">
                {scoreData.magicFormulaRank === 'top10'
                  ? 'Top 10% Jakości'
                  : scoreData.magicFormulaRank === 'top25'
                  ? 'Top 25% Jakości'
                  : 'Średnia jakość'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Score Visual Bar & Summary */}
      <div className="p-3.5 rounded-xl bg-surface border border-border-custom space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-3xs font-bold uppercase tracking-wider text-text-muted">
            Wynik bilansowy: <span className="font-mono text-text-primary font-black">{scoreData.score}/9</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-4 rounded-sm transition-colors ${
                  i < scoreData.score
                    ? scoreData.score >= 8
                      ? 'bg-success'
                      : scoreData.score >= 6
                      ? 'bg-primary'
                      : 'bg-warning'
                    : 'bg-surface-elevated border border-border-custom/80'
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          {scoreData.summary}
        </p>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            icon={expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          >
            {expanded ? 'Zwiń 9 kryteriów Piotroskiego' : 'Pokaż audyt 9 kryteriów Piotroskiego'}
          </Button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {expanded && <PiotroskiSignalsGrid signals={scoreData.signals} />}
    </div>
  );
};
