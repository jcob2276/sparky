import { FC } from 'react';
import type { PositionAnalystTarget } from '../../../lib/investments/portfolioForecastService';
import { Target, TrendingUp, Sparkles } from 'lucide-react';

interface Props {
  positions: PositionAnalystTarget[];
  horizonMonths: number;
}

export const PortfolioAnalystTargetsTable: FC<Props> = ({ positions, horizonMonths }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-primary" />
          <h4 className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
            Wyceny docelowe konsensusu Wall Street & GPW ({horizonMonths}M)
          </h4>
        </div>
        <span className="text-3xs font-mono text-text-muted">
          Źródła: FactSet · Bloomberg · Domy Maklerskie
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-custom bg-surface-elevated/40">
        <table className="w-full text-left text-xs font-mono">
          <thead className="text-3xs uppercase text-text-muted border-b border-border-custom/80 bg-surface-elevated/80">
            <tr>
              <th className="px-3 py-2.5">Walor</th>
              <th className="px-3 py-2.5 text-right">Cena bieżąca</th>
              <th className="px-3 py-2.5 text-right">Cena docelowa</th>
              <th className="px-3 py-2.5 text-right">Potencjał</th>
              <th className="px-3 py-2.5 text-center">Rekomendacja</th>
              <th className="px-3 py-2.5 hidden md:table-cell">Główny katalizator analityków</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/50">
            {positions.map((pos) => {
              const isPositive = pos.meanUpsidePct >= 0;
              return (
                <tr key={pos.ticker} className="hover:bg-surface transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 font-bold text-text-primary">
                      <span className="text-primary font-black">${pos.ticker}</span>
                    </div>
                    <div className="text-4xs text-text-muted font-sans truncate max-w-xs">
                      {pos.name}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right text-text-muted">
                    {pos.currentPricePln.toFixed(2)} PLN
                  </td>

                  <td className="px-3 py-3 text-right font-bold text-text-primary">
                    {pos.meanTargetPricePln.toFixed(2)} PLN
                  </td>

                  <td className="px-3 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isPositive ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {isPositive && <TrendingUp size={12} />}
                      <span>
                        {isPositive ? '+' : ''}
                        {pos.meanUpsidePct.toFixed(1)}%
                      </span>
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase border ${
                        pos.rating === 'Strong Buy'
                          ? 'bg-success/15 text-success border-success/30'
                          : pos.rating === 'Speculative Buy'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-surface-elevated text-text-secondary border-border-custom'
                      }`}
                    >
                      {pos.rating}
                    </span>
                  </td>

                  <td className="px-3 py-3 hidden md:table-cell font-sans text-3xs text-text-secondary max-w-sm">
                    <div className="flex items-start gap-1">
                      <Sparkles size={11} className="text-primary shrink-0 mt-0.5" />
                      <span>{pos.keyCatalyst}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
