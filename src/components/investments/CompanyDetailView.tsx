import { FC, useState } from 'react';
import { CompanyDetailHeader, CompanyDetailTab } from './CompanyDetailHeader';
import { CompanyPriceEventsChart } from './CompanyPriceEventsChart';
import { CompanyFundDisclosureCard } from './CompanyFundDisclosureCard';
import { CompanyKpiGrid } from './CompanyKpiGrid';
import { CompanyAboutCard } from './CompanyAboutCard';
import { CompanyPiotroskiCard } from './CompanyPiotroskiCard';
import { CompanySubTabsView } from './CompanySubTabsView';
import { useCompanyDetail } from '../../hooks/useCompanyDetail';
import Button from '../ui/Button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  ticker: string;
  market?: 'us' | 'gpw';
  initialName?: string;
  onBack: () => void;
  onNavigateTab?: (tab: string, prefill?: string) => void;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
}

export const CompanyDetailView: FC<Props> = ({
  ticker,
  market = 'us',
  initialName,
  onBack,
  onNavigateTab,
  watchlist,
  onToggleWatchlist,
}) => {
  const { data, loading, error, retry } = useCompanyDetail(ticker, initialName, market);
  const [activeTab, setActiveTab] = useState<CompanyDetailTab>('overview');

  const handleAskAnalyst = (t: string) => {
    if (onNavigateTab) {
      onNavigateTab(
        'analyst',
        `Przeanalizuj spółkę $${t}${market === 'gpw' ? '.PL' : ''}: omów dostępne dane, ich daty i ryzyka inwestycji.`
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-20 bg-surface-subtle animate-pulse rounded-md" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-surface-subtle animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-6 w-48 bg-surface-subtle animate-pulse rounded-md" />
              <div className="h-3 w-32 bg-surface-subtle animate-pulse rounded-md" />
            </div>
          </div>
          <div className="h-8 w-24 bg-surface-subtle animate-pulse rounded-xl" />
        </div>
        <div className="h-64 w-full bg-surface-subtle animate-pulse rounded-2xl" />
        <div className="h-52 w-full bg-surface-subtle animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-subtle animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <AlertCircle size={32} className="mx-auto text-danger" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text-primary">Błąd pobierania danych</h3>
          <p className="text-2xs text-text-muted">{error || 'Brak danych dla wybranej spółki'}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" onClick={onBack}>
            Powrót
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<RefreshCw size={13} />}
            onClick={retry}
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CompanyDetailHeader
        data={data}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isWatched={watchlist.includes(ticker)}
        onToggleWatchlist={() => onToggleWatchlist(ticker)}
        onBack={onBack}
      />

      {/* Tab Content */}
      {activeTab === 'overview' || market === 'gpw' ? (
        <div className="space-y-6">
          <CompanyPriceEventsChart data={data} />
          {market === 'us' && <CompanyFundDisclosureCard ticker={data.ticker} history={data.fundHistory} />}
          {market === 'us' && <CompanyKpiGrid data={data} />}
          <CompanyPiotroskiCard ticker={ticker} />
          <CompanyAboutCard data={data} onAskAnalyst={handleAskAnalyst} />
        </div>
      ) : (
        <CompanySubTabsView data={data} activeTab={activeTab} />
      )}
    </div>
  );
};
