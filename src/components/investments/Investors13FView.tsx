import { FC, useState } from 'react';
import { INVESTORS_13F_DATA, Investor13F, Holding13F } from '../../lib/investments/investors13FData';
import Button from '../ui/Button';
import { notify } from '../../lib/notify';
import { Download } from 'lucide-react';

interface HoldingRowProps {
  holding: Holding13F;
}

const HoldingRow: FC<HoldingRowProps> = ({ holding: h }) => {
  const changeBadge =
    h.changeType === 'new' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
        Nowa pozycja
      </span>
    ) : h.changeType === 'increased' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
        Zwiększona {h.changeSharesPercent ? `+${h.changeSharesPercent}%` : ''}
      </span>
    ) : h.changeType === 'reduced' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
        Zmniejszona {h.changeSharesPercent ? `${h.changeSharesPercent}%` : ''}
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-md text-2xs font-medium text-text-secondary border border-border-custom/50">
        Bez zmian
      </span>
    );

  return (
    <tr className="hover:bg-surface transition-colors">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs shadow-xs">
            ${h.ticker}
          </span>
          <div>
            <div className="font-semibold text-text-primary">{h.name}</div>
            <div className="text-2xs text-text-secondary">{h.sector}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 text-right">
        <div className="font-bold text-text-primary font-mono tabular-nums">
          {h.weightPercent.toFixed(1)}%
        </div>
        <div className="w-20 ml-auto bg-border-custom/30 rounded-full h-1.5 mt-1 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${Math.min(100, h.weightPercent * 2.5)}%` }}
          />
        </div>
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-text-primary tabular-nums font-medium">
        ${(h.valueUsd / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-text-secondary tabular-nums text-xs">
        {h.shares.toLocaleString()}
      </td>
      <td className="py-3.5 px-4 text-center">{changeBadge}</td>
      <td className="py-3.5 px-4 text-right">
        <a
          href={`https://www.tradingview.com/symbols/${h.ticker}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Wykres ↗
        </a>
      </td>
    </tr>
  );
};

export const Investors13FView: FC = () => {
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>(INVESTORS_13F_DATA[0].id);

  const currentInvestor: Investor13F =
    INVESTORS_13F_DATA.find((inv) => inv.id === selectedInvestorId) || INVESTORS_13F_DATA[0];

  const handleExportCsv = () => {
    const inv = currentInvestor;
    const headers = 'Ticker,Spółka,Sektor,Udział_%,Wartość_USD,Liczba_akcji,Zmiana_QoQ\n';
    const rows = inv.holdings
      .map(
        (h) =>
          `"${h.ticker}","${h.name}","${h.sector}","${h.weightPercent.toFixed(2)}","${h.valueUsd}","${h.shares}","${h.changeType}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfel_13F_${inv.id}_${inv.periodEnded ?? 'Q3'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Wyeksportowano portfel ${inv.name} do CSV!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Investor Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border-custom/50">
        {INVESTORS_13F_DATA.map((inv) => {
          const isSelected = inv.id === currentInvestor.id;
          return (
            <Button
              key={inv.id}
              size="sm"
              variant={isSelected ? 'primary' : 'secondary'}
              onClick={() => setSelectedInvestorId(inv.id)}
              className="rounded-xl shrink-0"
            >
              {inv.name}
            </Button>
          );
        })}
      </div>

      {/* Investor Profile Hero Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Formularz SEC 13F-HR
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                CIK: {currentInvestor.cik} · Koniec kwartału: {currentInvestor.periodEnded}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              {currentInvestor.name}
            </h2>
            <div className="text-sm font-semibold text-text-secondary">
              {currentInvestor.fundName}
            </div>
            <p className="text-xs text-text-secondary mt-2 max-w-3xl leading-relaxed">
              {currentInvestor.description}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shrink-0 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Wartość ujawnionego koszyka</div>
            <div className="text-2xl font-black text-text-primary font-mono tabular-nums mt-0.5">
              {currentInvestor.aumFormatted}
            </div>
            <div className="text-3xs text-text-secondary mt-1 font-mono">
              Raportowano: {currentInvestor.filingDate}
            </div>
          </div>
        </div>

        {/* Sector Allocation Bar */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center justify-between">
            <span>Struktura sektorowa portfela:</span>
            <span className="font-mono text-3xs text-text-muted">{currentInvestor.sectorBreakdown.length} sektorów</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentInvestor.sectorBreakdown.map((s) => (
              <span
                key={s.sector}
                className="px-2.5 py-1 rounded-xl bg-surface border border-border-custom/60 text-xs font-medium text-text-secondary flex items-center gap-1.5 shadow-xs"
              >
                <span>{s.sector}:</span>
                <strong className="text-text-primary font-mono tabular-nums">{s.percent}%</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings Table — OrcaFolio 1:1 format */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>📊</span> Pozycje w portfelu 13F ({currentInvestor.holdings.length})
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${currentInvestor.cik}&type=13F&dateb=&owner=include&count=10`}
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
              onClick={handleExportCsv}
              className="rounded-xl text-xs font-semibold"
            >
              Eksportuj CSV
            </Button>
          </div>
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
              {currentInvestor.holdings.map((h: Holding13F) => (
                <HoldingRow key={h.ticker} holding={h} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
