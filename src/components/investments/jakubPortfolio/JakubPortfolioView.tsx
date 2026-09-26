import { FC, useState } from 'react';
import {
  JakubPortfolioData,
  loadJakubPortfolio,
  saveJakubPortfolio,
  resetJakubPortfolio,
} from '../../../lib/investments/jakubPortfolioStorage';
import { JakubPortfolioSummaryCard } from './JakubPortfolioSummaryCard';
import { JakubHoldingsList } from './JakubHoldingsList';
import { JakubSmartMoneyDiagnosis } from './JakubSmartMoneyDiagnosis';
import { JakubAddPositionModal } from './JakubAddPositionModal';
import { confirmDialog, notify } from '../../../lib/notify';
import { formatShortDateWarsaw } from '../../../lib/date';
import type { MainTabType } from '../InvestmentsPage';

interface Props {
  onNavigateTab: (tab: MainTabType) => void;
}

export const JakubPortfolioView: FC<Props> = ({ onNavigateTab }) => {
  const [portfolio, setPortfolio] = useState<JakubPortfolioData>(loadJakubPortfolio);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleSavePortfolio = (updated: JakubPortfolioData) => {
    setPortfolio(updated);
    saveJakubPortfolio(updated);
  };

  const handleReset = async () => {
    const confirmed = await confirmDialog(
      'Czy na pewno chcesz przywrócić pierwotny stan portfela ze zrzutu ekranu IKE?'
    );
    if (!confirmed) return;
    const initial = resetJakubPortfolio();
    setPortfolio(initial);
    notify('Przywrócono stan początkowy portfela IKE', 'info');
  };

  const handleAskAnalyst = (ticker: string, _companyName: string) => {
    notify(`Przekierowano do Analityka AI dla waloru $${ticker}`, 'info');
    onNavigateTab('analyst');
  };

  const handleDiagnoseAI = () => {
    notify('Przekierowano do Analityka AI w celu diagnozy całego portfela', 'info');
    onNavigateTab('analyst');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* 1. Hero Summary Card (Moje IKE) */}
      <JakubPortfolioSummaryCard
        portfolio={portfolio}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onReset={handleReset}
        onDiagnoseAI={handleDiagnoseAI}
      />

      {/* 2. Smart Money & Jev System-1 Diagnosis */}
      <JakubSmartMoneyDiagnosis portfolio={portfolio} />

      {/* 3. Holdings List matching Mobile App */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
            Otwarte pozycje na rachunku IKE
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
