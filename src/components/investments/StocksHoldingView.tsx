import { FC, useState } from 'react';
import { INVESTORS_13F_DATA } from '../../lib/investments/investors13FData';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface Props {
  allCongressTrades: InsiderTradeItem[];
}

interface StockInvestorMatch {
  investorName: string;
  fundName: string;
  weightPercent: number;
  valueUsd: number;
  changeType: string;
}

const PoliticianTradeRow: FC<{ trade: InsiderTradeItem }> = ({ trade: t }) => {
  const isBuy =
    (t.transaction_type || '').toLowerCase().includes('buy') ||
    (t.transaction_type || '').toLowerCase().includes('purchase');

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm text-text-primary">{t.filer_name}</span>
          <span className="text-2xs font-mono text-text-secondary">{t.chamber || t.branch || 'USA'}</span>
        </div>
        <div className="text-xs text-text-secondary">{t.asset_name}</div>
      </div>

      <div className="flex items-center gap-4 text-right">
        <div>
          <div className="font-mono text-sm font-bold text-text-primary tabular-nums">
            {t.amount_label || `$${(t.amount_high || 0).toLocaleString()}`}
          </div>
          <div className="text-2xs font-mono text-text-secondary">Zgłoszono: {t.filing_date}</div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-2xs font-bold border ${
            isBuy ? 'bg-success/15 text-success border-success/30' : 'bg-danger/15 text-danger border-danger/30'
          }`}
        >
          {isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'}
        </span>
      </div>
    </div>
  );
};

export const StocksHoldingView: FC<Props> = ({ allCongressTrades }) => {
  const [query, setQuery] = useState('NVDA');
  const selectedQuery = query.trim().toUpperCase();

  const institutionalHolders: StockInvestorMatch[] = [];
  for (const inv of INVESTORS_13F_DATA) {
    const match = inv.holdings.find(
      (h) => h.ticker.toUpperCase() === selectedQuery || h.name.toUpperCase().includes(selectedQuery)
    );
    if (match) {
      institutionalHolders.push({
        investorName: inv.name,
        fundName: inv.fundName,
        weightPercent: match.weightPercent,
        valueUsd: match.valueUsd,
        changeType: match.changeType,
      });
    }
  }

  const politicianTrades = allCongressTrades.filter(
    (t) =>
      t.ticker &&
      (t.ticker.toUpperCase() === selectedQuery ||
        (t.asset_name && t.asset_name.toUpperCase().includes(selectedQuery)))
  );

  const quickPills = ['NVDA', 'AAPL', 'GOOGL', 'MSFT', 'BABA', 'BAC', 'OXY', 'DNP', 'CDR'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
            Analiza własnościowa spółek
          </span>
          <span className="text-2xs font-mono text-text-secondary">
            Cross-check: Formularze 13F & STOCK Act
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Kto posiada akcje spółki {selectedQuery || '...'}?
        </h2>
        <p className="text-xs text-text-secondary mt-1 max-w-2xl">
          Wpisz ticker lub nazwę spółki, aby sprawdzić, którzy z wielkich inwestorów oraz polityków trzymają ją w portfelu.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              size="md"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wpisz ticker (np. NVDA, AAPL, BABA, DNP)..."
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {quickPills.map((ticker) => (
              <Button
                key={ticker}
                size="sm"
                variant={selectedQuery === ticker ? 'primary' : 'secondary'}
                onClick={() => setQuery(ticker)}
                className="rounded-xl font-mono text-xs"
              >
                ${ticker}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Institutional 13F Holders Table */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>👔</span> Instytucjonalni inwestorzy 13F posiadający {selectedQuery} ({institutionalHolders.length})
          </h3>
          <span className="text-xs text-text-secondary font-mono">Dane z kwartalnych raportów SEC</span>
        </div>

        {institutionalHolders.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-secondary">
            Brak ujawnionej pozycji w monitorowanych portfelach 13F dla {selectedQuery}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Zarządzający & Fundusz</th>
                  <th className="py-3 px-4 text-right">Waga w portfelu</th>
                  <th className="py-3 px-4 text-right">Wartość pozycji</th>
                  <th className="py-3 px-4 text-center">Ostatnia zmiana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/40">
                {institutionalHolders.map((m) => (
                  <tr key={m.investorName} className="hover:bg-surface">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{m.investorName}</div>
                      <div className="text-2xs text-text-secondary">{m.fundName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-text-primary tabular-nums">
                      {m.weightPercent.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-text-primary tabular-nums">
                      ${(m.valueUsd / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-surface border border-border-custom text-text-primary">
                        {m.changeType === 'new' ? '🟢 Nowa' : m.changeType === 'increased' ? '🟢 Zwiększona' : m.changeType === 'reduced' ? '🔴 Zmniejszona' : '⚪ Bez zmian'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Politician / Insider Trades on this Stock */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>🏛</span> Politycy i insiderzy handlujący {selectedQuery} ({politicianTrades.length})
          </h3>
          <span className="text-xs text-text-secondary font-mono">STOCK Act & KNF MAR</span>
        </div>

        {politicianTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-secondary">
            Brak zarejestrowanych transakcji polityków dla {selectedQuery}.
          </div>
        ) : (
          <div className="divide-y divide-border-custom/40">
            {politicianTrades.map((t) => (
              <PoliticianTradeRow key={t.id} trade={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
