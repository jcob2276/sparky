import { FC, useState } from 'react';
import {

  loadKondzioPortfolio,
  saveKondzioPortfolio,
  resetKondzioPortfolio,
} from '../../../lib/investments/kondzioPortfolioStorage';
import { useLocalInvestmentPortfolio } from '../../../lib/investments/useLocalInvestmentPortfolio';
import { syncKondzioMarketPrices } from '../../../lib/investments/portfolioSyncService';
import { KondzioPortfolioSummaryCard } from './KondzioPortfolioSummaryCard';
import { JakubHoldingItem } from './JakubHoldingItem';
import { PortfolioSubNav } from './PortfolioSubNav';
import { PortfolioForecastCard } from './PortfolioForecastCard';
import { notify } from '../../../lib/notify';
import { formatShortDateWarsaw } from '../../../lib/date';
import type { MainTabType } from '../InvestmentsPage';

interface Props {
  onNavigateTab: (tab: MainTabType, prompt?: string) => void;
}

export const KondzioPortfolioView: FC<Props> = ({ onNavigateTab }) => {
  const { portfolio, valuationAsOf, isSyncing, lastSyncRates, handleSyncMarket: handleSync, handleReset } = useLocalInvestmentPortfolio(loadKondzioPortfolio, saveKondzioPortfolio, resetKondzioPortfolio, syncKondzioMarketPrices, 'Czy na pewno chcesz przywrócić pierwotny stan portfela Kondzia ze zrzutu ekranu XTB?');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAskAnalyst = (ticker: string, companyName: string) => {
    notify(`Przekierowano do Analityka AI dla waloru $${ticker}`, 'info');
    const prompt = `Przeanalizuj pozycję $${ticker} (${companyName}) z portfela Kondzia: jaki jest sentyment Smart Money, czy fundusze 13F lub insiderzy akumulują ten walor oraz jakie są perspektywy i ryzyka?`;
    onNavigateTab('analyst', prompt);
  };

  const handleDiagnose = () => {
    notify('Przekierowano do Analityka AI w celu diagnozy portfela Kondzia', 'info');
    const tickers = portfolio.positions.map((p) => `$${p.ticker}`).join(', ');
    const prompt = `Przeprowadź dogłębną diagnozę portfela Kondzia z rachunku XTB (${tickers}): portfel ma stopę zwrotu +${portfolio.totalPnlPct.toFixed(1)}% i silną ekspozycję na tech/AI (Nvidia, Nebius, Bloom Energy, Intel, Micron, Marvell) oraz GPW (Asbis, XTB, Allegro). Jakie są główne czynniki ryzyka, korelacje i czy warto zrealizować część zysków?`;
    onNavigateTab('analyst', prompt);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* 0. Top Portfolio Sub Navigation */}
      <PortfolioSubNav activeTab="kondzio_portfolio" onSelectTab={onNavigateTab} />

      {/* 1. Header Card (Portfel Kondzia) */}
      <KondzioPortfolioSummaryCard
        portfolio={portfolio}
        onSync={handleSync}
        onDiagnose={handleDiagnose}
        onReset={handleReset}
        isSyncing={isSyncing}
        lastSyncRates={lastSyncRates}
      />

      {/* 2. Holdings List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
            Otwarte pozycje w portfelu Kondzia
          </h3>
          <span className="text-3xs font-mono text-text-muted">
            {valuationAsOf ? `Pełna wycena z dnia: ${formatShortDateWarsaw(valuationAsOf)}` : "Wycena mieszana / ręczna — sprawdź daty pozycji"}
          </span>
        </div>

        <div className="space-y-2.5">
          {portfolio.positions.map((pos) => (
            <JakubHoldingItem
              key={pos.id}
              position={pos}
              totalValue={portfolio.marketValuePln}
              isExpanded={expandedId === pos.id}
              onToggleExpand={() => toggleExpand(pos.id)}
              onAskAnalyst={handleAskAnalyst}
            />
          ))}
        </div>
      </div>

      {/* 3. Analyst Predictions & Scenario Forecast */}
      <PortfolioForecastCard portfolio={portfolio} />
    </div>
  );
};



