import { FC } from 'react';
import { MainTabType } from './InvestmentsPage';
import Button from '../ui/Button';

interface Props {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  liveCount: number;
}

export const InvestmentsTabsBar: FC<Props> = ({ activeTab, onSelectTab, liveCount }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-border-custom/50">
      {/* Centrum */}
      <Button
        size="sm"
        variant={activeTab === 'dashboard' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('dashboard')}
        className="rounded-xl shrink-0 font-bold"
      >
        📊 Pulpit
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'analyst' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('analyst')}
        className="rounded-xl shrink-0 font-bold text-primary"
      >
        🤖 Analityk AI
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'watchlist' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('watchlist')}
        className="rounded-xl shrink-0 font-bold"
      >
        ⭐ Watchlista
      </Button>

      <div className="h-4 w-px bg-border-custom/60 shrink-0 mx-1" />

      {/* Rynek USA */}
      <Button
        size="sm"
        variant={activeTab === 'convergence' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('convergence')}
        className="rounded-xl shrink-0 font-semibold"
      >
        🔥 Zbieżność
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'screener' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('screener')}
        className="rounded-xl shrink-0"
      >
        🏢 Screener 13F
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'politicians' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('politicians')}
        className="rounded-xl shrink-0"
      >
        🏛 Kongres USA
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'investors' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('investors')}
        className="rounded-xl shrink-0"
      >
        👔 Superinwestorzy
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'simulation' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('simulation')}
        className="rounded-xl shrink-0 text-success font-semibold"
      >
        📈 Symulacja
      </Button>

      <div className="h-4 w-px bg-border-custom/60 shrink-0 mx-1" />

      {/* Rynek GPW */}
      <Button
        size="sm"
        variant={activeTab === 'gpw_shorts' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('gpw_shorts')}
        className="rounded-xl shrink-0 text-danger font-semibold"
      >
        📉 Szorty KNF
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'gpw_mar' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('gpw_mar')}
        className="rounded-xl shrink-0 text-text-secondary"
      >
        🇵🇱 GPW Insiderzy
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'stocks' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('stocks')}
        className="rounded-xl shrink-0 text-text-secondary"
      >
        🔍 Cross-Check
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'live' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('live')}
        className="rounded-xl shrink-0 text-text-secondary"
      >
        ⚡ Live ({liveCount})
      </Button>

      <Button
        size="sm"
        variant={activeTab === 'methodology' ? 'primary' : 'secondary'}
        onClick={() => onSelectTab('methodology')}
        className="rounded-xl shrink-0 text-text-muted"
      >
        📖 Metodologia
      </Button>
    </div>
  );
};
