import { FC } from 'react';

export interface StockConsensusItem {
  ticker: string;
  name: string;
  sector: string;
  priceUsd: number;
  changeToday: number;
  fundsBuying: number;
  fundsSelling: number;
  totalFunds: number;
  totalValueUsd: string;
  netScore: number;
  movementType: 'accumulation' | 'distribution' | 'neutral';
}

interface Props {
  stocks: StockConsensusItem[];
}

export const StocksConsensusTable: FC<Props> = ({ stocks }) => {
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
              <th className="py-3 px-4 text-center">Kupują vs Sprzedają</th>
              <th className="py-3 px-4 text-right">Łączna wartość</th>
              <th className="py-3 px-4 text-center">Wynik Netto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {stocks.map((stock) => {
              const isNetPositive = stock.netScore > 0;
              const isNetNegative = stock.netScore < 0;

              return (
                <tr key={stock.ticker} className="hover:bg-primary/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs shadow-xs">
                        ${stock.ticker}
                      </span>
                      <span className="font-semibold text-text-primary">{stock.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-text-secondary">
                    {stock.sector}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-text-primary tabular-nums">
                    ${stock.priceUsd.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                    <span className={stock.changeToday >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                      {stock.changeToday >= 0 ? `+${stock.changeToday.toFixed(2)}%` : `${stock.changeToday.toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs font-mono">
                    <span className="text-success font-bold">{stock.fundsBuying} kupuje</span>
                    <span className="text-text-muted mx-1">·</span>
                    <span className="text-danger font-bold">{stock.fundsSelling} sprzedaje</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-text-primary tabular-nums">
                    {stock.totalValueUsd}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-black border ${
                        isNetPositive
                          ? 'bg-success/15 text-success border-success/30'
                          : isNetNegative
                          ? 'bg-danger/15 text-danger border-danger/30'
                          : 'bg-surface text-text-muted border-border-custom'
                      }`}
                    >
                      {stock.netScore > 0 ? `+${stock.netScore}` : stock.netScore}
                    </span>
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
