import { FC, useState } from 'react';
import Button from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { CongressOverview } from '../../lib/investments/congressService';
import { formatDatePl, STOCK_ACT_DEADLINE_DAYS } from '../../lib/investments/congressTradeFormat';

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
          <h3 className="text-xs font-semibold text-text-primary">
            Strumień ujawnień ({stream.length})
          </h3>
          <p className="text-2xs text-text-muted mt-0.5">
            Najnowsze zgłoszenia polityków USA (STOCK Act): widełki kwot i daty wprost z ujawnień. Czerwone opóźnienie = ponad 45 dni.
          </p>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="p-12 text-center text-xs text-text-muted font-mono">
          Brak zgłoszeń spełniających wybrane kryteria wyszukiwania.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="bg-surface-subtle text-2xs font-semibold text-text-muted border-b border-border-custom/40">
              <tr>
                <th className="py-2.5 px-4">Polityk</th>
                <th className="py-2.5 px-4">Ticker</th>
                <th className="py-2.5 px-4 text-center">Typ</th>
                <th className="py-2.5 px-4 text-right">Widełki kwoty</th>
                <th className="py-2.5 px-4 text-right">Transakcja</th>
                <th className="py-2.5 px-4 text-right">Ujawnienie</th>
                <th className="py-2.5 px-4 text-right">Opóźnienie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
              {shown.map((trade) => {
                const isLate = trade.delayDays != null && trade.delayDays > STOCK_ACT_DEADLINE_DAYS;

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
                          <div className="text-2xs text-text-muted truncate">
                            <span>{trade.chamber === 'senate' ? 'SENAT' : 'IZBA'}</span>
                            <span className="mx-1">·</span>
                            <span>{trade.party ? `${trade.party}-` : '—'}{trade.state}</span>
                            {trade.owner && <span> · {trade.owner === 'spouse' ? 'współmałżonek' : trade.owner === 'joint' ? 'wspólnie' : trade.owner === 'dependent_child' ? 'dziecko' : trade.owner === 'self' ? 'własna' : 'właściciel nieustalony'}</span>}
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
                      <div className="text-2xs text-text-muted max-w-48 truncate" title={trade.companyName}>{trade.companyName}</div>
                    </td>

                    {/* Typ */}
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-md text-2xs font-semibold border border-border-custom ${
                          trade.type === 'buy'
                            ? 'text-success bg-surface-subtle'
                            : 'text-danger bg-surface-subtle'
                        }`}
                      >
                        {trade.type === 'buy' ? 'Kupno' : trade.type === 'sell' ? 'Sprzedaż' : trade.type === 'exchange' ? 'Zamiana' : 'Inny typ'}
                      </span>
                    </td>

                    {/* Kwota */}
                    <td className="py-3 px-4 text-right text-text-primary font-bold tabular-nums whitespace-nowrap">
                      {trade.amountLabel}
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-text-primary">{formatDatePl(trade.transactionDate)}</td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-text-primary">
                      <div>{formatDatePl(trade.disclosureDate)}</div>
                      {trade.sourceUrl && <a href={trade.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-primary underline text-2xs" onClick={(event) => event.stopPropagation()}>Dokument źródłowy</a>}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                      <span className={`font-bold ${isLate ? 'text-danger' : 'text-text-muted'}`}
                        title={isLate ? `Po terminie ${STOCK_ACT_DEADLINE_DAYS} dni z ustawy STOCK Act` : undefined}>
                        {trade.delayDays == null ? 'Brak dat' : `${trade.delayDays} dni`}
                      </span>
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
