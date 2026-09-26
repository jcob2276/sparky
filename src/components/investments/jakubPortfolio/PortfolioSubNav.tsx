import { FC } from 'react';
import { MainTabType } from '../InvestmentsPage';
import { Wallet, Users } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  activeTab: 'jakub_portfolio' | 'kondzio_portfolio';
  onSelectTab: (tab: MainTabType) => void;
}

export const PortfolioSubNav: FC<Props> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-surface-elevated/60 border border-border-custom shadow-2xs">
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <Button
          size="sm"
          variant={activeTab === 'jakub_portfolio' ? 'primary' : 'ghost'}
          onClick={() => onSelectTab('jakub_portfolio')}
          className={`flex-1 sm:flex-none rounded-xl text-xs font-bold gap-2 ${
            activeTab === 'jakub_portfolio'
              ? 'shadow-xs'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Wallet size={15} />
          <span>Portfel Jakuba</span>
          <span
            className={`text-4xs font-mono font-normal px-1.5 py-0.5 rounded-md ${
              activeTab === 'jakub_portfolio'
                ? 'bg-background/20 text-on-accent'
                : 'bg-surface text-text-muted border border-border-custom'
            }`}
          >
            Ja
          </span>
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'kondzio_portfolio' ? 'primary' : 'ghost'}
          onClick={() => onSelectTab('kondzio_portfolio')}
          className={`flex-1 sm:flex-none rounded-xl text-xs font-bold gap-2 ${
            activeTab === 'kondzio_portfolio'
              ? 'shadow-xs'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Users size={15} />
          <span>Portfel Kondzia</span>
          <span
            className={`text-4xs font-mono font-normal px-1.5 py-0.5 rounded-md ${
              activeTab === 'kondzio_portfolio'
                ? 'bg-background/20 text-on-accent'
                : 'bg-surface text-text-muted border border-border-custom'
            }`}
          >
            Kondzio
          </span>
        </Button>
      </div>

      <div className="hidden sm:flex items-center pr-3 text-3xs font-mono text-text-muted">
        <span>Przełącz widok portfela</span>
      </div>
    </div>
  );
};
