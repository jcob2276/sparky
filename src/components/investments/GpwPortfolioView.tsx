import { FC } from 'react';
import { GPW_INSIDER_TRADES_SEED } from '../../lib/investments/gpwTradesSeed';
import { InvestmentsCard } from './InvestmentsCard';

export const GpwPortfolioView: FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border-custom/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              🇵🇱
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
                  GPW Warszawa · MAR art. 19 KNF
                </span>
                <span className="text-2xs font-mono text-text-secondary">
                  Zarządy & Rady Nadzorcze
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Giełda Papierów Wartościowych w Warszawie (GPW)
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Oficjalne zawiadomienia o transakcjach osób pełniących obowiązki zarządcze. Prawdziwe zakupy za miliony złotych z własnych kieszeni (Skin in the game).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://stooq.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border-custom bg-surface text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 shadow-xs"
            >
              Wykresy: Stooq.pl ↗
            </a>
          </div>
        </div>

        {/* GPW KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Indeksy bazowe</div>
            <div className="text-xl font-black text-text-primary font-mono mt-1">WIG20 · mWIG40 · sWIG80</div>
            <div className="text-3xs text-text-secondary mt-1">Spółki o najwyższej płynności</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Sygnał zakupu
            </div>
            <div className="text-xl font-black text-success font-mono mt-1">Skin In The Game</div>
            <div className="text-3xs text-success font-medium mt-1">Zarządy kupują własne akcje</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-primary">Regulacja KNF</div>
            <div className="text-xl font-black text-primary font-mono mt-1">MAR art. 19</div>
            <div className="text-3xs text-text-secondary mt-1">Obowiązkowe zgłoszenie w 3 dni</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Najwięksi insiderzy</div>
            <div className="text-xl font-black text-text-primary font-mono mt-1">DNP · CDR · XTB · MRB</div>
            <div className="text-3xs text-text-secondary mt-1">Ponad 10M PLN wolumenu</div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GPW_INSIDER_TRADES_SEED.map((trade) => (
          <InvestmentsCard key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
};
