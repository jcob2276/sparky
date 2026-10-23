import { FC } from 'react';
import { useInsidersData } from './useInsidersData';
import { InsiderSummaryCards } from './InsiderSummaryCards';
import { InsiderIntensityMatrix } from './InsiderIntensityMatrix';
import { InsiderClustersTable } from './InsiderClustersTable';
import { InsiderFeedTable } from './InsiderFeedTable';
import { InvestmentsSkeleton } from './InvestmentsSkeleton';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const LiveTradesView: FC<Props> = ({ onNavigateTab }) => {
  const { data, loading, error } = useInsidersData();

  const handleSelectTicker = (_ticker: string) => {
    if (onNavigateTab) {
      onNavigateTab('screener');
    }
  };

  if (loading) {
    return (
      <InvestmentsSkeleton rows={6} hero={false} label="Pobieranie transakcji Form 4" />
    );
  }

  if (error) return <div role="alert" className="p-6 text-danger">{error}</div>;

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <p className="text-xs text-text-muted">{data.coverage}</p>
      <InsiderSummaryCards stats={data.stats} />

      {/* 2. Natężenie zakupów insiderów (90 dni) */}
      <InsiderIntensityMatrix rows={data.intensityRows} />

      {/* 3. Klastry zakupów z ostatnich 90 dni (bez cenzury) */}
      <InsiderClustersTable
        clusters={data.clusters}
        topSinglePurchases={data.topSinglePurchases}
        onSelectTicker={handleSelectTicker}
      />

      {/* 4. Pełny feed transakcji Form 4 (bez cenzury) */}
      <InsiderFeedTable
        feed={data.feed}
        onSelectTicker={handleSelectTicker}
      />

      {/* 5. Notatka prawna / disclaimer */}
      <div className="text-2xs font-mono text-text-muted leading-relaxed pt-2 border-t border-border-custom/40">
        Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych
        źródeł (formularze 13F SEC, ujawnienia STOCK Act, zgłoszenia Form 4). Serwis nie świadczy usług
        doradztwa inwestycyjnego ani zarządzania portfelem. Wyniki historyczne nie stanowią gwarancji przyszłych wyników.
      </div>
    </div>
  );
};
