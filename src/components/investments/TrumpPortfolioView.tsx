import { FC } from 'react';
import { TRUMP_TRADES_SEED } from '../../lib/investments/trumpTradesSeed';
import { InvestmentsCard } from './InvestmentsCard';

export const TrumpPortfolioView: FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border-custom/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              🦅
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
                  R-FL · 45th & 47th President
                </span>
                <span className="text-2xs font-mono text-text-secondary">
                  Office of Government Ethics (OGE)
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Donald J. Trump Portfolio & Disclosures
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Oficjalne oświadczenia majątkowe i alokacja kapitału: akcje DJT, amerykańskie obligacje skarbowe T-Bills, złoto i fundusze indeksowe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.oge.gov/web/oge.nsf/Officials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border-custom bg-surface text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 shadow-xs"
            >
              Źródło: OGE Form 278e ↗
            </a>
          </div>
        </div>

        {/* Trump KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Główny pakiet akcji</div>
            <div className="text-xl font-black text-danger font-mono mt-1">DJT (Truth Social)</div>
            <div className="text-3xs text-text-secondary mt-1">114.75M akcji założycielskich</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Gotówka & Bony USA</div>
            <div className="text-xl font-black text-text-primary font-mono tabular-nums mt-1">$25M - $50M</div>
            <div className="text-3xs text-text-secondary mt-1">US Treasury Bills (rent. ~5%)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Pasywny S&P 500</div>
            <div className="text-xl font-black text-text-primary font-mono tabular-nums mt-1">$1M - $5M</div>
            <div className="text-3xs text-text-secondary mt-1">SPDR S&P 500 ETF (SPY)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-warning">Złoto & Kruszce</div>
            <div className="text-xl font-black text-warning font-mono tabular-nums mt-1">$500k - $1M</div>
            <div className="text-3xs text-text-secondary mt-1">SPDR Gold Trust (GLD)</div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRUMP_TRADES_SEED.map((trade) => (
          <InvestmentsCard key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
};
