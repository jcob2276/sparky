import { FC, useState } from 'react';
import { PELOSI_TRADES_SEED } from '../../lib/investments/pelosiTradesSeed';
import { InvestmentsCard } from './InvestmentsCard';
import Button from '../ui/Button';

export const PelosiPortfolioView: FC = () => {
  const [subFilter, setSubFilter] = useState<'all' | 'calls' | 'shares' | 'nvda' | 'googl'>('all');

  const filtered = PELOSI_TRADES_SEED.filter((t) => {
    if (subFilter === 'calls') return (t.asset_type || '').toLowerCase().includes('call');
    if (subFilter === 'shares') return (t.asset_type || '').toLowerCase().includes('akcje');
    if (subFilter === 'nvda') return t.ticker === 'NVDA';
    if (subFilter === 'googl') return t.ticker === 'GOOGL';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Card — Quiver Quantitative Style */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border-custom/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-info/10 border border-info/20 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              🏛
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-info/15 text-info border border-info/30">
                  D-CA · Izba Reprezentantów
                </span>
                <span className="text-2xs font-mono text-text-secondary">
                  Paul & Nancy Pelosi
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Nancy Pelosi Portfolio & Trading Alpha
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Najsłynniejszy portfel na Kapitolu. Strategia: opcje Call LEAPS Deep-In-The-Money na gigantów technologicznych.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.quiverquant.com/congresstrading/politician/Nancy%20Pelosi-P000197"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border-custom bg-surface text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 shadow-xs"
            >
              Źródło: Quiver Quant ↗
            </a>
          </div>
        </div>

        {/* Quant KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Wartość portfela</div>
            <div className="text-xl font-black text-text-primary font-mono tabular-nums mt-1">~ $140M - $250M</div>
            <div className="text-3xs text-text-secondary mt-1">Oficjalne widełki majątku</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Roczna Alfa vs S&P 500
            </div>
            <div className="text-xl font-black text-success font-mono tabular-nums mt-1">+68.4%</div>
            <div className="text-3xs text-success font-medium mt-1">vs SPY +24.1%</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-primary">Kluczowa broń</div>
            <div className="text-xl font-black text-primary font-mono mt-1">Opcje LEAPS</div>
            <div className="text-3xs text-text-secondary mt-1">Deep ITM Delta &gt; 0.85</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Największe zakłady</div>
            <div className="text-xl font-black text-text-primary font-mono mt-1">NVDA · GOOGL · MSFT</div>
            <div className="text-3xs text-text-secondary mt-1">Ponad 60% alokacji</div>
          </div>
        </div>
      </div>

      {/* Subfilters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={subFilter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setSubFilter('all')}
          className="rounded-xl"
        >
          Wszystkie ruchy ({PELOSI_TRADES_SEED.length})
        </Button>
        <Button
          size="sm"
          variant={subFilter === 'calls' ? 'primary' : 'secondary'}
          onClick={() => setSubFilter('calls')}
          className="rounded-xl"
        >
          ⚡ Opcje Call LEAPS
        </Button>
        <Button
          size="sm"
          variant={subFilter === 'shares' ? 'primary' : 'secondary'}
          onClick={() => setSubFilter('shares')}
          className="rounded-xl"
        >
          📜 Akcje zwykłe
        </Button>
        <Button
          size="sm"
          variant={subFilter === 'nvda' ? 'primary' : 'secondary'}
          onClick={() => setSubFilter('nvda')}
          className="rounded-xl"
        >
          🔥 NVIDIA ($NVDA)
        </Button>
        <Button
          size="sm"
          variant={subFilter === 'googl' ? 'primary' : 'secondary'}
          onClick={() => setSubFilter('googl')}
          className="rounded-xl"
        >
          🔍 Google ($GOOGL)
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((trade) => (
          <InvestmentsCard key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
};
