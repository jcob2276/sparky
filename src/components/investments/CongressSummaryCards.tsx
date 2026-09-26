import { FC } from 'react';
import { CompanyLogo } from './CompanyLogo';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { CongressOverview } from '../../lib/investments/congressService';

interface Props {
  data: CongressOverview;
  onSelectStock: (ticker: string) => void;
  onSelectPolitician: (name: string) => void;
}

export const CongressSummaryCards: FC<Props> = ({
  data,
  onSelectStock,
  onSelectPolitician,
}) => {
  const formatVol = (val: number) => {
    if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1).replace('.', ',')} tys USD`;
    return `${val.toLocaleString()} USD`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Najczęściej kupowane */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-3xs font-black uppercase tracking-wider text-text-primary">
          Najczęściej kupowane
        </div>
        <div className="space-y-2.5">
          {data.topBought.map((item) => (
            <div
              key={item.ticker}
              onClick={() => onSelectStock(item.ticker)}
              className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-surface-subtle transition-colors group"
            >
              <CompanyLogo ticker={item.ticker} name={item.companyName} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold text-text-primary group-hover:text-primary transition-colors">
                  {item.ticker}
                </div>
                <div className="text-3xs text-text-muted truncate">
                  Kupiono {item.count}× · wolumen {formatVol(item.volumeUsd)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Najczęściej sprzedawane */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-3xs font-black uppercase tracking-wider text-text-primary">
          Najczęściej sprzedawane
        </div>
        <div className="space-y-2.5">
          {data.topSold.map((item) => (
            <div
              key={item.ticker}
              onClick={() => onSelectStock(item.ticker)}
              className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-surface-subtle transition-colors group"
            >
              <CompanyLogo ticker={item.ticker} name={item.companyName} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold text-text-primary group-hover:text-primary transition-colors">
                  {item.ticker}
                </div>
                <div className="text-3xs text-text-muted truncate">
                  Sprzedano {item.count}× · wolumen {formatVol(item.volumeUsd)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Największe transakcje */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-3xs font-black uppercase tracking-wider text-text-primary">
          Największe transakcje
        </div>
        <div className="space-y-2.5">
          {data.largestTrades.map((t, idx) => (
            <div
              key={idx}
              onClick={() => onSelectPolitician(t.politicianName)}
              className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-surface-subtle transition-colors group"
            >
              {t.ticker !== '—' ? (
                <CompanyLogo ticker={t.ticker} name={t.ticker} size={30} />
              ) : (
                <PoliticianAvatar name={t.politicianName} bioguideId={t.bioguideId} size={30} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                  {t.politicianName} · <span className="font-mono">{t.ticker}</span>
                </div>
                <div className="text-3xs text-text-muted truncate">
                  {t.amountLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Średni zwrot 1Y po ujawnieniu */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
          Średni zwrot 1Y po ujawnieniu
        </div>
        <div className="space-y-2.5 my-auto">
          {/* Demokraci */}
          <div className="w-full h-9 rounded-xl bg-primary text-text-on-primary flex items-center justify-between px-3.5 shadow-2xs font-bold text-xs sm:text-sm">
            <span>Demokraci</span>
            <span className="font-mono">+{data.partyReturns.democrats.pct.toFixed(1).replace('.', ',')}%</span>
          </div>

          {/* Republikanie */}
          <div className="flex">
            <div
              className="h-9 rounded-xl bg-danger text-text-on-primary flex items-center justify-between px-3.5 shadow-2xs font-bold text-xs sm:text-sm whitespace-nowrap"
              style={{
                width: `${Math.max(48, Math.min(100, (data.partyReturns.republicans.pct / data.partyReturns.democrats.pct) * 100))}%`,
              }}
            >
              <span className="mr-2">Republikanie</span>
              <span className="font-mono">+{data.partyReturns.republicans.pct.toFixed(1).replace('.', ',')}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
