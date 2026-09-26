import { FC, useState } from 'react';
import Button from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { CongressOverview } from '../../lib/investments/congressService';

interface Props {
  stream: CongressOverview['stream'];
  onSelectPolitician: (name: string) => void;
  onSelectStock: (ticker: string) => void;
}

export const CongressStreamTable: FC<Props> = ({
  stream,
  onSelectPolitician,
  onSelectStock,
}) => {
  const [visibleCount, setVisibleCount] = useState(30);
  const shown = stream.slice(0, visibleCount);

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm space-y-2">
      <div className="p-4 border-b border-border-custom/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
            Strumień ujawnień ({stream.length})
          </h3>
          <p className="text-2xs text-text-muted mt-0.5">
            Ostatnie zgłoszenia transakcji polityków USA w ramach STOCK Act
          </p>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="p-12 text-center text-xs text-text-muted font-mono">
          Brak zgłoszeń spełniających wybrane kryteria wyszukiwania.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
              <tr>
                <th className="py-2.5 px-4">Polityk</th>
                <th className="py-2.5 px-4">Ticker</th>
                <th className="py-2.5 px-4 text-center">Typ</th>
                <th className="py-2.5 px-4 text-right">Kwota</th>
                <th className="py-2.5 px-4 text-right">Opóźnienie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
              {shown.map((trade) => {
                const isLate = trade.delayDays >= 30;

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-surface-subtle/50 transition-colors cursor-pointer group"
                    onClick={() => onSelectPolitician(trade.politicianName)}
                  >
                    {/* Polityk */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <PoliticianAvatar
                          name={trade.politicianName}
                          bioguideId={trade.bioguideId}
                          party={trade.party}
                          size={32}
                        />
                        <div className="min-w-0">
                          <div className="font-sans font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                            {trade.politicianName}
                          </div>
                          <div className="text-3xs text-text-muted truncate">
                            <span>{trade.chamber === 'senate' ? 'SENAT' : 'IZBA'}</span>
                            <span className="mx-1">·</span>
                            <span>{trade.party ? `${trade.party}-` : '—'}{trade.state}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Ticker */}
                    <td className="py-3 px-4">
                      <div
                        className="flex items-center gap-2 group/t cursor-pointer"
                        onClick={(e) => {
                          if (trade.ticker && trade.ticker !== '—') {
                            e.stopPropagation();
                            onSelectStock(trade.ticker);
                          }
                        }}
                      >
                        {trade.ticker !== '—' && (
                          <CompanyLogo ticker={trade.ticker} name={trade.companyName} size={22} />
                        )}
                        <span className="font-bold text-text-primary group-hover/t:text-primary transition-colors">
                          {trade.ticker}
                        </span>
                      </div>
                    </td>

                    {/* Typ */}
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-md text-3xs font-semibold uppercase tracking-wider border border-border-custom ${
                          trade.type === 'buy'
                            ? 'text-success bg-surface-subtle'
                            : 'text-danger bg-surface-subtle'
                        }`}
                      >
                        {trade.type === 'buy' ? 'Kupno' : 'Sprzedaż'}
                      </span>
                    </td>

                    {/* Kwota */}
                    <td className="py-3 px-4 text-right text-text-primary font-bold tabular-nums">
                      {trade.amountLabel}
                    </td>

                    {/* Opóźnienie / Status Kopiowania */}
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-bold ${isLate ? 'text-danger' : 'text-text-muted'}`}>
                          {trade.delayDays} DNI
                        </span>
                        {trade.type === 'buy' && (
                          <span
                            className={`px-1.5 py-0.2 rounded-xs text-4xs font-mono font-bold uppercase ${
                              trade.delayDays <= 14
                                ? 'bg-success/15 text-success border border-success/30'
                                : trade.delayDays <= 30
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : 'bg-warning/15 text-warning border border-warning/30'
                            }`}
                          >
                            {trade.delayDays <= 14
                              ? '⚡ Świeże wejście'
                              : trade.delayDays <= 30
                                ? 'W strefie'
                                : 'Opóźnione'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Show more button */}
      {visibleCount < stream.length && (
        <div className="p-3 text-center border-t border-border-custom/30">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVisibleCount((c) => c + 30)}
            className="text-xs font-bold text-primary hover:underline"
          >
            Pokaż kolejne ujawnienia ({stream.length - visibleCount} pozostało)
          </Button>
        </div>
      )}
    </div>
  );
};
