import { FC, useState } from 'react';
import {

  loadJakubPortfolio,
  saveJakubPortfolio,
  resetJakubPortfolio,
} from '../../../lib/investments/jakubPortfolioStorage';
import { useLocalInvestmentPortfolio } from '../../../lib/investments/useLocalInvestmentPortfolio';
import { syncPortfolioMarketPrices } from '../../../lib/investments/portfolioSyncService';
import { JakubPortfolioSummaryCard } from './JakubPortfolioSummaryCard';
import { JakubHoldingsList } from './JakubHoldingsList';
import { JakubAddPositionModal } from './JakubAddPositionModal';
import { PortfolioSubNav } from './PortfolioSubNav';
import { PortfolioForecastCard } from './PortfolioForecastCard';
import { notify } from '../../../lib/notify';
import { formatShortDateWarsaw } from '../../../lib/date';
import type { MainTabType } from '../InvestmentsPage';

interface Props {
  onNavigateTab: (tab: MainTabType, prompt?: string) => void;
}

export const JakubPortfolioView: FC<Props> = ({ onNavigateTab }) => {
  const { portfolio, valuationAsOf, isSyncing, lastSyncRates, handleSavePortfolio, handleSyncMarket, handleReset } = useLocalInvestmentPortfolio(loadJakubPortfolio, saveJakubPortfolio, resetJakubPortfolio, syncPortfolioMarketPrices, 'Czy na pewno chcesz przywrócić pierwotny stan portfela?');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAskAnalyst = (ticker: string, companyName: string) => {
    notify(`Przekierowano do Analityka AI dla waloru $${ticker}`, 'info');
    const prompt = `Przeanalizuj pozycję $${ticker} (${companyName}) z mojego portfela: jaki jest sentyment Smart Money, czy fundusze 13F lub insiderzy akumulują ten walor oraz jakie są perspektywy i ryzyka?`;
    onNavigateTab('analyst', prompt);
  };

  const handleDiagnoseAI = (customPrompt?: string) => {
    notify('Przekierowano do Analityka AI w celu diagnozy portfela', 'info');
    const prompt =
      customPrompt ||
      `Przeprowadź dogłębną diagnozę mojego portfela (${portfolio.positions.map((p) => `$${p.ticker}`).join(', ')}) pod kątem zbieżności Smart Money, ekspozycji sektorowej, asymetrii zysku do ryzyka oraz rekomendacji dalszej alokacji wolnych środków.`;
    onNavigateTab('analyst', prompt);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* 0. Top Portfolio Sub Navigation */}
      <PortfolioSubNav activeTab="jakub_portfolio" onSelectTab={onNavigateTab} />

      {/* 1. Hero Summary Card (Portfel Jakuba) */}
      <JakubPortfolioSummaryCard
        portfolio={portfolio}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onReset={handleReset}
        onDiagnoseAI={handleDiagnoseAI}
        onSyncMarket={handleSyncMarket}
        isSyncing={isSyncing}
        lastSyncRates={lastSyncRates}
      />

      {/* 2. Holdings List matching Mobile App */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
            Otwarte pozycje w portfelu Jakuba
          </h3>
          <span className="text-3xs font-mono text-text-muted">
            {valuationAsOf ? `Pełna wycena z dnia: ${formatShortDateWarsaw(valuationAsOf)}` : "Wycena mieszana / ręczna — sprawdź daty pozycji"}
          </span>
        </div>

        <JakubHoldingsList
          positions={portfolio.positions}
          onAskAnalyst={handleAskAnalyst}
        />
      </div>

      {/* 3. Analyst Predictions & Scenario Forecast */}
      <PortfolioForecastCard portfolio={portfolio} />

      {/* Management Modal */}
      <JakubAddPositionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        portfolio={portfolio}
        onSave={handleSavePortfolio}
      />
    </div>
  );
};
