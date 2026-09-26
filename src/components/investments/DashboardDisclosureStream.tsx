import { FC } from 'react';
import Button from '../ui/Button';
import { ArrowRight } from 'lucide-react';
import { DashboardData } from '../../lib/investments/dashboardService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  items: DashboardData['streamItems'];
  onViewAll: () => void;
}

export const DashboardDisclosureStream: FC<Props> = ({ items, onViewAll }) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Strumień ujawnień
          </span>
          <p className="text-3xs text-text-secondary mt-0.5">
            Ostatnie zgłoszenia Form 4, transakcje Kongresu i pozycje KNF
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onViewAll}
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          className="text-xs font-semibold text-primary"
        >
          wszystkie
        </Button>
      </div>

      {/* Scrollable list */}
      <div className="max-h-72 overflow-y-auto divide-y divide-border-custom/30 pr-1">
        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-secondary">
            Brak najnowszych ujawnień w rejestrze.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="py-2.5 px-1.5 flex items-center justify-between gap-3 hover:bg-surface-elevated/40 rounded-xl transition-colors"
            >
              {/* Left Details */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-3xs font-semibold text-text-muted w-12 shrink-0">
                  {item.dateLabel}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded-md text-3xs font-mono font-black border shrink-0 ${
                    item.sourceType === 'FORM 4'
                      ? 'bg-warning/15 text-warning border-warning/30'
                      : item.sourceType === 'KNF'
                      ? 'bg-danger/15 text-danger border-danger/30'
                      : 'bg-primary/15 text-primary border-primary/30'
                  }`}
                >
                  {item.sourceType}
                </span>

                <CompanyLogo ticker={item.ticker} size={22} className="shrink-0" />

                <span className="font-mono font-bold text-xs text-text-primary shrink-0">
                  {item.ticker}
                </span>

                <p className="text-xs text-text-secondary truncate max-w-xs sm:max-w-md" title={item.description}>
                  {item.description}
                </p>
              </div>

              {/* Right Value / Amount */}
              <div className="text-right shrink-0">
                <span
                  className={`font-mono text-xs font-bold tabular-nums ${
                    item.amountOrPercent.includes('%')
                      ? 'text-danger'
                      : item.amountOrPercent.includes('USD')
                      ? 'text-success'
                      : 'text-text-muted'
                  }`}
                >
                  {item.amountOrPercent}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
