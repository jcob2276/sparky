import { FC } from 'react';
import Button from '../ui/Button';
import { Star } from 'lucide-react';
import { EnrichedStockConsensus } from '../../lib/investments/consensusService';
import { CompanyLogo } from './CompanyLogo';
import { MiniSparkline } from './MiniSparkline';

interface Props {
  stock: EnrichedStockConsensus;
  isWatched: boolean;
  onToggleWatchlist: (ticker: string) => void;
  onSelectStockForChart: (ticker: string, name: string) => void;
}

export const StocksConsensusRow: FC<Props> = ({
  stock,
  isWatched,
  onToggleWatchlist,
  onSelectStockForChart,
}) => {
  const totalMoves = stock.fundsBuying + stock.fundsSelling;
  const buyPercent = totalMoves > 0 ? (stock.fundsBuying / totalMoves) * 100 : 50;
  const sellPercent = totalMoves > 0 ? (stock.fundsSelling / totalMoves) * 100 : 50;

  return (
    <tr
      className="hover:bg-primary/5 transition-colors group cursor-pointer"
      onClick={() => onSelectStockForChart(stock.ticker, stock.name)}
    >
      {/* Spółka */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <CompanyLogo ticker={stock.ticker} name={stock.name} size={34} />
          <div className="min-w-0">
            <div className="font-mono font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
              {stock.ticker}
            </div>
            <div
              className="text-2xs text-text-secondary truncate max-w-36 sm:max-w-48"
              title={stock.name}
            >
              {stock.name}
            </div>
          </div>
        </div>
      </td>

      {/* Sektor */}
      <td className="py-3 px-4 text-2xs text-text-secondary">
        {stock.sector}
      </td>

      {/* Kurs USD */}
      <td className="py-3 px-4 text-right font-mono font-bold text-text-primary tabular-nums">
        {stock.priceUsd != null ? stock.priceUsd.toFixed(2).replace('.', ',') : '—'}
      </td>

      {/* Dziś */}
      <td className="py-3 px-4 text-right font-mono text-2xs tabular-nums">
        {stock.changeToday == null ? (
          <span className="text-text-muted">—</span>
        ) : (
          <span
            className={
              stock.changeToday >= 0
                ? 'text-success font-semibold'
                : 'text-danger font-semibold'
            }
          >
            {stock.changeToday >= 0
              ? `+${stock.changeToday.toFixed(1).replace('.', ',')}%`
              : `${stock.changeToday.toFixed(1).replace('.', ',')}%`}
          </span>
        )}
      </td>

      {/* Kupują · Sprzedają (split progress bar + text) */}
      <td className="py-3 px-4 text-center">
        <div className="flex flex-col items-center justify-center gap-1.5 w-32 mx-auto">
          <div className="w-full h-1.5 bg-border-custom/40 rounded-full overflow-hidden flex shadow-2xs">
            <div
              className="bg-success h-full transition-all"
              style={{ width: `${buyPercent}%` }}
            />
            <div
              className="bg-danger/80 h-full transition-all"
              style={{ width: `${sellPercent}%` }}
            />
          </div>
          <div className="font-mono text-3xs text-text-secondary whitespace-nowrap">
            <span className="font-bold text-text-primary">{stock.fundsBuying} kupuje</span>
            <span className="mx-1 text-text-muted">·</span>
            <span className="font-bold text-text-primary">{stock.fundsSelling} sprzedaje</span>
          </div>
        </div>
      </td>

      {/* Fund. */}
      <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-text-primary tabular-nums">
        {stock.totalFunds}
      </td>

      {/* Wartość */}
      <td className="py-3 px-4 text-right font-mono text-xs text-text-primary tabular-nums">
        {stock.totalValueUsd}
      </td>

      {/* Star Watchlist */}
      <td
        className="py-3 px-2 text-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist(stock.ticker);
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          className="p-1 rounded-lg"
          title={isWatched ? 'Usuń z watchlisty' : 'Dodaj do watchlisty'}
        >
          <Star
            size={14}
            className={
              isWatched
                ? 'fill-warning text-warning'
                : 'text-text-muted/60 hover:text-text-primary'
            }
          />
        </Button>
      </td>

      {/* Netto */}
      <td className="py-3 px-3 text-center">
        <span
          className={`inline-block min-w-8 text-center px-2 py-0.5 rounded-md text-xs font-mono font-black border ${
            stock.netScore > 0
              ? 'bg-success/15 text-success border-success/30'
              : stock.netScore < 0
              ? 'bg-danger/15 text-danger border-danger/30'
              : 'bg-surface text-text-muted border-border-custom'
          }`}
        >
          {stock.netScore > 0 ? `+${stock.netScore}` : stock.netScore}
        </span>
      </td>

      {/* 12M Sparkline */}
      <td className="py-3 px-4 text-center">
        <div className="flex justify-center">
          <MiniSparkline
            data={stock.sparkline}
            width={64}
            height={20}
          />
        </div>
      </td>
    </tr>
  );
};
