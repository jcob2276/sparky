import { FC, useState, useEffect } from 'react';
import { CompanyDetailHeader, CompanyDetailTab } from './CompanyDetailHeader';
import { CompanyPriceEventsChart } from './CompanyPriceEventsChart';
import { CompanyQuarterlyChart } from './CompanyQuarterlyChart';
import { CompanyKpiGrid } from './CompanyKpiGrid';
import { CompanyAboutCard } from './CompanyAboutCard';
import { CompanySubTabsView } from './CompanySubTabsView';
import { fetchCompanyDetailData, CompanyDetailData } from '../../lib/investments/companyDetailService';
import Button from '../ui/Button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  ticker: string;
  initialName?: string;
  onBack: () => void;
  onNavigateTab?: (tab: string, prefill?: string) => void;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
}

export const CompanyDetailView: FC<Props> = ({
  ticker,
  initialName,
  onBack,
  onNavigateTab,
  watchlist,
  onToggleWatchlist,
}) => {
  const [data, setData] = useState<CompanyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyDetailTab>('overview');

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetchCompanyDetailData(ticker, initialName);
        if (active) {
          setData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Nie udało się pobrać danych spółki');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ticker, initialName, retryCount]);

  const handleAskAnalyst = (t: string) => {
    if (onNavigateTab) {
      onNavigateTab(
        'analyst',
        `Przeanalizuj spółkę ${t}: jakie fundusze 13F i politycy w nią inwestują oraz jaki jest sentyment?`
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
            onClick={() => {
              setLoading(true);
              setRetryCount((c) => c + 1);
            }}
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
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          <CompanyPriceEventsChart data={data} />
          <CompanyQuarterlyChart data={data} />
          <CompanyKpiGrid data={data} />
          <CompanyAboutCard data={data} onAskAnalyst={handleAskAnalyst} />
        </div>
      ) : (
        <CompanySubTabsView data={data} activeTab={activeTab} />
      )}
    </div>
  );
};
