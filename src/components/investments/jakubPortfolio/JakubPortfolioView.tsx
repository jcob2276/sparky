import { FC, useState } from 'react';
import {
  JakubPortfolioData,
  loadJakubPortfolio,
  saveJakubPortfolio,
  resetJakubPortfolio,
} from '../../../lib/investments/jakubPortfolioStorage';
import { syncPortfolioMarketPrices } from '../../../lib/investments/portfolioSyncService';
import { JakubPortfolioSummaryCard } from './JakubPortfolioSummaryCard';
import { JakubHoldingsList } from './JakubHoldingsList';
import { JakubSmartMoneyDiagnosis } from './JakubSmartMoneyDiagnosis';
import { JakubAddPositionModal } from './JakubAddPositionModal';
import { PortfolioSubNav } from './PortfolioSubNav';
import { confirmDialog, notify } from '../../../lib/notify';
import { formatShortDateWarsaw } from '../../../lib/date';
import type { MainTabType } from '../InvestmentsPage';

interface Props {
  onNavigateTab: (tab: MainTabType, prompt?: string) => void;
}

export const JakubPortfolioView: FC<Props> = ({ onNavigateTab }) => {
  const [portfolio, setPortfolio] = useState<JakubPortfolioData>(loadJakubPortfolio);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncRates, setLastSyncRates] = useState<{ usdPln: number; eurPln: number; date: string } | null>(null);

  const handleSavePortfolio = (updated: JakubPortfolioData) => {
    setPortfolio(updated);
    saveJakubPortfolio(updated);
  };

  const handleSyncMarket = async () => {
    try {
      setIsSyncing(true);
      const res = await syncPortfolioMarketPrices();
      setPortfolio(res.portfolio);
      setLastSyncRates(res.rates);
      notify(
        `Zaktualizowano kursy (${res.syncedCount} pozycji). NBP: USD ${res.rates.usdPln.toFixed(2)} zł, EUR ${res.rates.eurPln.toFixed(2)} zł`,
        'success'
      );
    } catch (err) {
      console.error('[JakubPortfolioView] sync error:', err);
      notify('Nie udało się pobrać aktualnych kursów rynkowych', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirmDialog(
      'Czy na pewno chcesz przywrócić pierwotny stan portfela?'
    );
    if (!confirmed) return;
    const initial = resetJakubPortfolio();
    setPortfolio(initial);
    setLastSyncRates(null);
    notify('Przywrócono stan początkowy portfela', 'info');
  };

  const handleAskAnalyst = (ticker: string, companyName: string) => {
    notify(`Przekierowano do Analityka AI dla waloru $${ticker}`, 'info');
    const prompt = `Przeanalizuj pozycję $${ticker} (${companyName}) z mojego portfela: jaki jest sentyment Smart Money, czy fundusze 13F lub insiderzy akumulują ten walor oraz jakie są perspektywy i ryzyka?`;
    onNavigateTab('analyst', prompt);
  };

  const handleDiagnoseAI = (customPrompt?: string) => {
    notify('Przekierowano do Analityka AI w celu diagnozy portfela', 'info');
    const prompt =
      customPrompt ||
      `Przeprowadź dogłębną diagnozę mojego portfela ($JEDI, $MRVL, $CDR, $SXR8) pod kątem zbieżności Smart Money, ekspozycji sektorowej, asymetrii zysku do ryzyka oraz rekomendacji dalszej alokacji wolnych środków.`;
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

      {/* 2. Smart Money & Jev System-1 Diagnosis */}
      <JakubSmartMoneyDiagnosis portfolio={portfolio} />

      {/* 3. Holdings List matching Mobile App */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
            Otwarte pozycje w portfelu Jakuba
          </h3>
          <span className="text-3xs font-mono text-text-muted">
            Aktualizacja: {formatShortDateWarsaw(portfolio.lastUpdated)}
          </span>
        </div>

        <JakubHoldingsList
          positions={portfolio.positions}
          onAskAnalyst={handleAskAnalyst}
        />
      </div>

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
