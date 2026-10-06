import { useState } from 'react';
import { confirmDialog, notify } from '../notify';
import type { JakubPortfolioData } from './jakubPortfolioStorage';
import type { KondzioPortfolioData } from './kondzioPortfolioStorage';
import type { SyncPortfolioResult } from './portfolioSyncService';
import { portfolioValuationAsOf } from './portfolioSyncService';

export function useLocalInvestmentPortfolio<T extends JakubPortfolioData | KondzioPortfolioData>(
  load: () => T, save: (data: T) => void, reset: () => T,
  sync: () => Promise<SyncPortfolioResult<T>>, resetPrompt: string,
) {
  const [portfolio, setPortfolio] = useState<T>(load);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncRates, setLastSyncRates] = useState<SyncPortfolioResult['rates']>(null);
  const handleSavePortfolio = (updated: T) => { save(updated); setPortfolio(updated); };
  const handleSyncMarket = async () => {
    try {
      setIsSyncing(true);
      const res = await sync();
      setPortfolio(res.portfolio);
      setLastSyncRates(res.rates);
      notify(`Zaktualizowano ${res.syncedCount} z ${res.portfolio.positions.length} pozycji.${res.failedTickers.length ? ' Bez nowej wyceny: ' + res.failedTickers.join(', ') : ''}`, res.failedTickers.length ? 'info' : 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się pobrać notowań.', 'error');
    } finally { setIsSyncing(false); }
  };
  const handleReset = async () => {
    if (!await confirmDialog(resetPrompt)) return;
    const initial = reset();
    save(initial);
    setPortfolio(initial);
    setLastSyncRates(null);
    notify('Przywrócono stan początkowy portfela', 'info');
  };
  return { portfolio, valuationAsOf: portfolioValuationAsOf(portfolio), isSyncing, lastSyncRates, handleSavePortfolio, handleSyncMarket, handleReset };
}
