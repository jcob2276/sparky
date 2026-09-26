import { FC } from 'react';
import { SuperinvestorItem, LiveHoldingItem } from '../../lib/investments/superinvestorsApi';
import { HoldingRow } from './HoldingRow';
import Button from '../ui/Button';
import { Download } from 'lucide-react';

interface Props {
  currentInvestor: SuperinvestorItem | undefined;
  holdings: LiveHoldingItem[];
  loadingHoldings: boolean;
  onExportCsv: () => void;
}

export const InvestorHoldingsTable: FC<Props> = ({
  currentInvestor,
  holdings,
  loadingHoldings,
  onExportCsv,
}) => {
  return (
    <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>📊</span> Pozycje w portfelu ({holdings.length})
          {loadingHoldings && (
            <span className="text-2xs font-mono text-primary animate-pulse">Ładowanie...</span>
          )}
        </h3>
        {currentInvestor && (
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.sec.gov/edgar/browse/?CIK=${currentInvestor.cik}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              SEC EDGAR ↗
            </a>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download size={13} />}
              onClick={onExportCsv}
              className="rounded-xl text-xs font-semibold"
            >
              Eksportuj CSV
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Spółka & Ticker</th>
              <th className="py-3 px-4 text-right">Udział w koszyku</th>
              <th className="py-3 px-4 text-right">Wartość rynkowa</th>
              <th className="py-3 px-4 text-right">Liczba akcji</th>
              <th className="py-3 px-4 text-center">Zmiana QoQ</th>
              <th className="py-3 px-4 text-right">Wykres</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {holdings.map((h: LiveHoldingItem) => (
              <HoldingRow key={h.ticker + h.name} holding={h} />
            ))}
            {holdings.length === 0 && !loadingHoldings && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-text-muted">
                  Brak ujawnionych pozycji w bieżącym okresie dla tego funduszu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
