import { FC, useState, useEffect } from 'react';
import { fetchInsidersPageData, InsidersPageData } from '../../lib/investments/insidersService';
import { InsiderSummaryCards } from './InsiderSummaryCards';
import { InsiderIntensityMatrix } from './InsiderIntensityMatrix';
import { InsiderClustersTable } from './InsiderClustersTable';
import { InsiderFeedTable } from './InsiderFeedTable';
import { Loader2 } from 'lucide-react';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const LiveTradesView: FC<Props> = ({ onNavigateTab }) => {
  const [data, setData] = useState<InsidersPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await fetchInsidersPageData();
      if (!active) return;
      setData(res);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectTicker = (_ticker: string) => {
    if (onNavigateTab) {
      onNavigateTab('screener');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-xs font-mono text-text-muted">Pobieranie transakcji Form 4 i klastrów zakupowych...</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* 1. Nagłówek i 3 Karty KPI */}
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
      <div className="text-3xs font-mono text-text-muted leading-relaxed pt-2 border-t border-border-custom/40">
        Serwis ma charakter wyłącznie informacyjno-edukacyjny. Prezentowane dane pochodzą z publicznych
        źródeł (formularze 13F SEC, ujawnienia STOCK Act, zgłoszenia Form 4). Serwis nie świadczy usług
        doradztwa inwestycyjnego ani zarządzania portfelem. Wyniki historyczne nie stanowią gwarancji przyszłych wyników.
      </div>
    </div>
  );
};
