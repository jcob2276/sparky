import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { fetchLiveGpwShorts } from '../../lib/investments/superinvestorsApi';
import type { CompanyShortSummary } from '../../lib/investments/knfShortsData';
import { fetchGpwInsiderTrades } from '../../lib/investments/publicDisclosures';
import type { InsiderTradeItem } from '../../lib/investments/investmentsApi';

interface Props {
  onNavigateTab: (tab: string) => void;
}

function isBuy(trade: InsiderTradeItem): boolean {
  const type = (trade.transaction_type ?? '').toLowerCase();
  return type.includes('buy') || type.includes('purchase') || type.includes('nabycie') || type.includes('kupno');
}

export const ConvergenceGpwCard: FC<Props> = ({ onNavigateTab }) => {
  const [gpwShorts, setGpwShorts] = useState<CompanyShortSummary[]>([]);
  const [gpwMatches, setGpwMatches] = useState<Array<{
    ticker: string;
    companyName: string;
    tradeDate: string;
    shortPercent: number;
  }>>([]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchLiveGpwShorts(), fetchGpwInsiderTrades()])
      .then(([shorts, trades]) => {
        if (!active) return;
        setGpwShorts(shorts);
        const matches: Array<{
          ticker: string;
          companyName: string;
          tradeDate: string;
          shortPercent: number;
        }> = [];

        for (const short of shorts) {
          const buyTrade = trades.find(
            (t) => t.ticker && t.ticker.toUpperCase() === short.ticker.toUpperCase() && isBuy(t)
          );
          if (buyTrade) {
            matches.push({
              ticker: short.ticker,
              companyName: short.companyName,
              tradeDate: buyTrade.transaction_date || buyTrade.filing_date || '',
              shortPercent: short.totalShortPercent,
            });
          }
        }
        setGpwMatches(matches);
      })
      .catch(() => {
        if (active) {
          setGpwShorts([]);
          setGpwMatches([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-danger">
            Zbieżność GPW: Insider Kupuje + Short Spada
          </div>
          <p className="text-2xs text-text-secondary">
            Akumulacja na GPW (redukcja krótkich pozycji KNF + zakupy insiderów):
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onNavigateTab('gpw_shorts')}
          className="text-xs text-primary"
        >
          Szorty KNF →
        </Button>
      </div>

      {gpwMatches.length > 0 ? (
        <div className="space-y-2">
          {gpwMatches.map((m) => (
            <div key={m.ticker} className="p-3 rounded-2xl bg-surface border border-success/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-text-primary">{m.ticker}</span>
                  <span className="text-2xs text-text-secondary">{m.companyName}</span>
                </div>
                <div className="text-3xs text-success mt-0.5 font-semibold">
                  Zakup insidera ({m.tradeDate}) · Szort KNF {m.shortPercent}%
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-success/10 text-success border border-success/20">
                ALERT
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-surface border border-border-custom/50 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <div className="text-xs font-bold text-text-primary">Brak zbieżnego zakupu zarządu dziś</div>
              <p className="text-3xs text-text-secondary">Oczekiwanie na zakup akcji przez członka zarządu na spółkach z rejestru KNF.</p>
            </div>
          </div>

          {gpwShorts.length > 0 && (
            <div className="pt-2 border-t border-border-custom/40">
              <div className="text-3xs font-black uppercase tracking-wider text-text-muted mb-1.5">
                Aktywne pozycje krótkie (KNF):
              </div>
              <div className="flex flex-wrap gap-2">
                {gpwShorts.slice(0, 3).map((item) => (
                  <div key={item.ticker} className="px-2.5 py-1 rounded-xl bg-surface border border-border-custom/60 flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-text-primary">{item.ticker}</span>
                    <span className="text-2xs font-mono font-bold text-danger">{item.totalShortPercent}%</span>
                    <span className="text-3xs text-text-muted truncate max-w-28">{item.companyName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
