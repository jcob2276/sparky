import { FC } from 'react';
import { CompanyLogo } from './CompanyLogo';
import type { SignalRow } from '../../lib/investments/signalsApi';
import { Sparkles, Target, ArrowRight } from 'lucide-react';

interface Props {
  rows: SignalRow[];
  onSelectTicker?: (ticker: string) => void;
}

export const TripleConfluenceRadar: FC<Props> = ({ rows, onSelectTicker }) => {
  // Find rows with multi-source confluence (13F + Politicians)
  const confluentStocks = rows
    .filter(
      (r) =>
        r.fundNetBuyers > 0 &&
        (r.polBuys > 0 || r.politicianBuyers > 0) &&
        r.score >= 70
    )
    .slice(0, 3);

  if (confluentStocks.length === 0) return null;

  return (
    <div className="bg-surface border-2 border-primary/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-primary/20 text-primary">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
                Radar Potrójnej Zbieżności (Super-Sygnały 10/10)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-4xs font-mono uppercase font-black bg-primary text-text-on-primary">
                VIP Setup
              </span>
            </div>
            <p className="text-3xs text-text-muted mt-0.5">
              Spółki, gdzie jednocześnie kumulują się zakupy Superinwestorów 13F oraz Członków Kongresu USA
            </p>
          </div>
        </div>

        <div className="text-3xs font-mono text-primary font-bold hidden sm:block">
          Najwyższe prawdopodobieństwo alfy
        </div>
      </div>

      {/* Grid of Confluent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {confluentStocks.map((item) => {
          return (
            <div
              key={item.ticker}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTicker?.(item.ticker)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectTicker?.(item.ticker)}
              className="p-3.5 rounded-2xl bg-surface border border-border-custom/80 hover:border-primary transition-all flex flex-col justify-between gap-3 shadow-2xs group cursor-pointer"
            >
              <div>
                {/* Ticker & Logo */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo ticker={item.ticker} name={item.companyName} size={30} />
                    <div>
                      <div className="font-mono font-bold text-sm text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{item.ticker}</span>
                        <span className="text-3xs font-sans text-text-muted truncate max-w-28">
                          {item.companyName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                    Wynik: {item.score}
                  </span>
                </div>

                {/* Evidence bullets */}
                <div className="space-y-1 text-3xs font-mono text-text-secondary bg-surface-elevated/50 p-2.5 rounded-xl border border-border-custom/40">
                  <div className="flex items-center gap-1.5 text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    <span>+{item.fundNetBuyers} funduszy 13F netto dokupuje</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>
                      {item.politicianBuyers > 0 ? item.politicianBuyers : item.polBuys} polityków kupuje (STOCK Act)
                    </span>
                  </div>
                  {item.insiderBuys > 0 && (
                    <div className="flex items-center gap-1.5 text-text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
                      <span>{item.insiderBuys} transakcji insiderów</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer / action */}
              <div className="pt-2 border-t border-border-custom/40 flex items-center justify-between text-3xs font-mono">
                <span className="inline-flex items-center gap-1 text-success font-semibold">
                  <Target size={11} />
                  <span>Strefa wejścia</span>
                </span>

                <span className="text-primary font-bold group-hover:underline flex items-center gap-0.5">
                  <span>Analiza</span>
                  <ArrowRight size={11} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
