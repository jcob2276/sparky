import { FC } from 'react';
import { CompanyShortSummary } from '../../lib/investments/knfShortsData';
import Button from '../ui/Button';

interface Props {
  activeCompany: CompanyShortSummary;
  onClose: () => void;
}

export const GpwShortsBreakdownModal: FC<Props> = ({ activeCompany, onClose }) => {
  return (
    <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/50">
        <h4 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>🔍</span> Szczegółowy wykaz funduszy szortujących {activeCompany.companyName} ({activeCompany.ticker})
        </h4>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
          ✕ Zamknij
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeCompany.positions.map((pos) => (
          <div key={pos.id} className="p-3.5 rounded-2xl bg-surface border border-border-custom shadow-xs">
            <div className="text-xs font-bold text-text-primary mb-1">{pos.holderName}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-custom/40">
              <span className="text-2xs text-text-secondary font-mono">Data: {pos.positionDate}</span>
              <span className="font-mono text-sm font-black text-danger">{pos.shortPercent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
