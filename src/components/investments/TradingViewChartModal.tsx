import { FC, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import { X, ExternalLink, LineChart } from 'lucide-react';
import { getMarketLinks, getTradingViewSymbol } from '../../lib/investments/marketLinks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  companyName?: string;
  market?: 'USA' | 'GPW';
}

export const TradingViewChartModal: FC<Props> = ({
  isOpen,
  onClose,
  ticker,
  companyName,
  market = 'USA',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanTicker = ticker.replace(/[$]/g, '').trim().toUpperCase();
  const tvSymbol = getTradingViewSymbol(cleanTicker, market);
  const externalLinks = getMarketLinks(cleanTicker, market);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Embed TradingView Advanced Chart Widget
  useEffect(() => {
    if (!isOpen || !cleanTicker) return;

    const container = containerRef.current;
    if (!container) return;

    // Reset container contents
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Europe/Warsaw',
      theme: 'dark',
      style: '1',
      locale: 'pl',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      save_image: false,
      support_host: 'https://www.tradingview.com',
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isOpen, cleanTicker, tvSymbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6 bg-scrim/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border-custom rounded-3xl max-w-5xl w-full h-5/6 max-h-screen flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <LineChart size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-text-primary tracking-tight">
                  ${cleanTicker}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-2xs font-bold border ${
                    market === 'GPW'
                      ? 'bg-danger/10 text-danger border-danger/20'
                      : 'bg-info/10 text-info border-info/20'
                  }`}
                >
                  {market}
                </span>
                <span className="text-3xs font-mono text-text-muted hidden md:inline">
                  {tvSymbol}
                </span>
              </div>
              {companyName && companyName !== cleanTicker && (
                <p className="text-xs text-text-secondary truncate mt-0.5 font-medium">
                  {companyName}
                </p>
              )}
            </div>
          </div>

          {/* Quick links & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              {externalLinks.map((link) => (
                <a
                  key={link.provider}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-surface border border-border-custom text-2xs font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 inline-flex items-center gap-1 transition-colors"
                  title={`Otwórz w ${link.label}`}
                >
                  <span>{link.label}</span>
                  <ExternalLink size={10} className="text-text-muted" />
                </a>
              ))}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl p-1.5 text-text-secondary hover:text-text-primary"
              aria-label="Zamknij wykres"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* TradingView Chart Container */}
        <div className="flex-1 w-full bg-surface relative min-h-0">
          <div
            ref={containerRef}
            className="tradingview-widget-container w-full h-full"
          />
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-border-custom/40 bg-surface/50 flex items-center justify-between text-3xs font-mono text-text-muted shrink-0">
          <span>Interaktywne świece, wskaźniki techniczne (RSI, MACD, SMA) · TradingView Live</span>
          <span className="hidden sm:inline">Strefa czasowa: Europe/Warsaw (CET/CEST)</span>
        </div>
      </div>
    </div>
  );
};
