import { FC } from 'react';
import { EnrichedStockConsensus } from '../../lib/investments/consensusService';
import { StocksConsensusRow } from './StocksConsensusRow';


interface Props {
  stocks: EnrichedStockConsensus[];
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectStockForChart: (ticker: string, name: string) => void;
}

export const StocksConsensusTable: FC<Props> = ({
  stocks,
  watchlist,
  onToggleWatchlist,
  onSelectStockForChart,
}) => {
  return (
    <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Spółka</th>
              <th className="py-3 px-4">Sektor</th>
              <th className="py-3 px-4 text-right">Kurs USD</th>
              <th className="py-3 px-4 text-right">Dziś</th>
              <th className="py-3 px-4 text-center min-w-32">Kupują · Sprzedają</th>
              <th className="py-3 px-4 text-center">Fund.</th>
              <th className="py-3 px-4 text-right">Wartość</th>
              <th className="py-3 px-2 text-center w-10">⭐</th>
              <th className="py-3 px-3 text-center">Netto</th>
              <th className="py-3 px-4 text-center w-24">12M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30 text-xs">
            {stocks.map((stock) => (
              <StocksConsensusRow
                key={stock.ticker}
                stock={stock}
                isWatched={watchlist.includes(stock.ticker)}
                onToggleWatchlist={onToggleWatchlist}
                onSelectStockForChart={onSelectStockForChart}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
