import { FC, useState } from 'react';
import type { PortfolioPosition, JakubPortfolioData } from '../../../lib/investments/jakubPortfolioStorage';
import { JakubAddPositionForm } from './JakubAddPositionForm';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, Plus, Wallet } from 'lucide-react';
import { notify } from '../../../lib/notify';
import { useModalBackHandler } from '../../../lib/investments/useModalBackHandler';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  portfolio: JakubPortfolioData;
  onSave: (updated: JakubPortfolioData) => void;
}

export const JakubAddPositionModal: FC<Props> = ({
  isOpen,
  onClose,
  portfolio,
  onSave,
}) => {
  const [cash, setCash] = useState(portfolio.freeCashPln.toString());

  useModalBackHandler('jakubAddPosition', isOpen, onClose);

  if (!isOpen) return null;

  const handleUpdateCash = () => {
    const numCash = parseFloat(cash.replace(',', '.'));
    if (isNaN(numCash) || numCash < 0) {
      notify('Wprowadź prawidłową kwotę gotówki', 'error');
      return;
    }
    const diff = numCash - portfolio.freeCashPln;
    const updated: JakubPortfolioData = {
      ...portfolio,
      freeCashPln: numCash,
      totalValuePln: portfolio.totalValuePln + diff,
      lastUpdated: new Date().toISOString(),
    };
    onSave(updated);
    notify('Zaktualizowano stan wolnych środków', 'info');
  };

  const handleAddPosition = (newPos: PortfolioPosition) => {
    const nextPositions = [newPos, ...portfolio.positions];
    const newMarketVal = nextPositions.reduce((acc, p) => acc + p.currentValue, 0);
    const updated: JakubPortfolioData = {
      ...portfolio,
      positions: nextPositions,
      marketValuePln: newMarketVal,
      totalValuePln: newMarketVal + portfolio.freeCashPln,
      lastUpdated: new Date().toISOString(),
    };

    onSave(updated);
    notify(`Dodano pozycję ${newPos.ticker} do portfela`, 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-border-custom p-6 shadow-2xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Plus size={16} />
            </div>
            <h3 className="font-black text-sm sm:text-base text-text-primary">
              Zarządzaj portfelem Jakuba
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="p-1 rounded-xl text-text-muted hover:text-text-primary h-8 w-8"
          >
            <X size={18} />
          </Button>
        </div>

        {/* 1. Free cash quick update */}
        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/70 space-y-2">
          <div className="text-3xs font-mono text-text-muted uppercase flex items-center gap-1.5">
            <Wallet size={12} className="text-primary" />
            <span>Aktualizacja wolnych środków (PLN)</span>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              size="sm"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="np. 608.71"
              className="font-mono"
            />
            <Button size="sm" variant="tonal" onClick={handleUpdateCash} className="rounded-xl text-xs shrink-0">
              Zapisz
            </Button>
          </div>
        </div>

        {/* 2. Add holding form */}
        <JakubAddPositionForm onAddPosition={handleAddPosition} onClose={onClose} />
      </div>
    </div>
  );
};
