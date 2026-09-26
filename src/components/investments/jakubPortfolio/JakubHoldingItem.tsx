import { FC } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import { CompanyLogo } from '../CompanyLogo';
import {
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  position: PortfolioPosition;
  totalValue: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAskAnalyst: (ticker: string, companyName: string) => void;
}

export const JakubHoldingItem: FC<Props> = ({
  position: pos,
  totalValue,
  isExpanded,
  onToggleExpand,
  onAskAnalyst,
}) => {
  const isLoss = pos.pnlPln < 0;
  const weightPct = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border-custom bg-surface hover:border-primary/50 transition-all shadow-2xs overflow-hidden">
      {/* Main Card row matching mobile app */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        {/* Left: Logo & Company info */}
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo ticker={pos.ticker} name={pos.name} size={36} />

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-text-primary truncate">
                {pos.name}
              </span>
              <span className="px-1.5 py-0.2 rounded-md font-mono text-4xs bg-surface-elevated text-text-muted border border-border-custom uppercase font-semibold">
                {pos.type}
              </span>
              <span className="px-1.5 py-0.2 rounded-md font-mono text-4xs bg-primary/10 text-primary border border-primary/20">
                {pos.market}
              </span>
            </div>

            <div className="text-3xs font-mono text-text-muted flex items-center gap-2">
              <span>
                {pos.shares} @ {pos.avgBuyPrice.toFixed(2)}
              </span>
              <span>•</span>
              <span>{weightPct.toFixed(1)}% portfela</span>
            </div>
          </div>
        </div>

        {/* Right: Value & PnL */}
        <div className="text-right shrink-0 flex items-center gap-3">
          <div className="space-y-0.5">
            <div className="font-bold font-mono text-xs sm:text-sm text-text-primary">
              {pos.currentValue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
            </div>

            <div
              className={`text-3xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                isLoss ? 'text-danger' : 'text-success'
              }`}
            >
              {isLoss ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              <span>
                {pos.pnlPln > 0 ? '+' : ''}
                {pos.pnlPln.toFixed(2)} ({pos.pnlPct > 0 ? '+' : ''}
                {pos.pnlPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="text-text-muted">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Details / Smart Money & AI Confluence */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-custom/50 bg-surface-elevated/30 space-y-3 animate-fade-in text-xs">
          {pos.knfShortStatus && (
            <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-3xs font-mono flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Rejestr KNF:</strong> {pos.knfShortStatus}
              </div>
            </div>
          )}

          {pos.smartMoneySignal && (
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-primary text-3xs font-mono flex items-start gap-2">
              <Sparkles size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Smart Money:</strong> {pos.smartMoneySignal}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-3xs font-mono text-text-muted">
              Ticker giełdowy: <strong className="text-text-primary">${pos.ticker}</strong>
            </div>

            <Button
              size="sm"
              variant="tonal"
              onClick={() => onAskAnalyst(pos.ticker, pos.name)}
              className="text-3xs gap-1 rounded-xl"
            >
              <MessageSquare size={12} />
              <span>Zapytaj Analityka AI o ${pos.ticker}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
