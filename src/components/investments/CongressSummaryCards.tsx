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

  const totalTrades = data.partyActivity.democrats.tradesCount + data.partyActivity.republicans.tradesCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Najczęściej kupowane */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-2xs font-semibold text-text-primary">
          Najczęściej kupowane
        </div>
        <div className="space-y-2.5">
          {!data.topBought.length && <p className="text-xs text-text-muted">Brak zakupów w wybranym zakresie.</p>}
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
                <div className="text-2xs text-text-muted truncate">
                  Kupiono {item.count}× · szacunek {formatVol(item.volumeUsd)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Najczęściej sprzedawane */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-2xs font-semibold text-text-primary">
          Najczęściej sprzedawane
        </div>
        <div className="space-y-2.5">
          {!data.topSold.length && <p className="text-xs text-text-muted">Brak sprzedaży w wybranym zakresie.</p>}
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
                <div className="text-2xs text-text-muted truncate">
                  Sprzedano {item.count}× · szacunek {formatVol(item.volumeUsd)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Największe transakcje */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-2xs font-semibold text-text-primary">
          Największe transakcje
        </div>
        <div className="space-y-2.5">
          {!data.largestTrades.length && <p className="text-xs text-text-muted">Brak ujawnionych kwot w wybranym zakresie.</p>}
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
                <div className="text-2xs text-text-muted truncate">
                  {t.amountLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Aktywność wg partii (z ujawnień, bez zwrotu) */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
        <div className="text-2xs font-semibold text-text-primary">
          Aktywność wg partii
        </div>
        <div className="space-y-2.5 my-auto">
          {([
            ['Demokraci', data.partyActivity.democrats, 'bg-primary'],
            ['Republikanie', data.partyActivity.republicans, 'bg-danger'],
          ] as const).map(([label, group, bar]) => (
            <div key={label} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-text-primary">{label}</span>
                <span className="font-mono tabular-nums text-text-muted">{group.tradesCount} transakcji</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${totalTrades ? Math.max(2, (group.tradesCount / totalTrades) * 100) : 0}%` }} />
              </div>
              <div className="text-2xs text-text-muted">szacunek {formatVol(group.volumeUsd)} (środek widełek)</div>
            </div>
          ))}
        </div>
        <p className="text-2xs text-text-muted">Liczba ujawnień, nie wynik inwestycyjny. Politycy bez przypisanej partii pominięci.</p>
      </div>
    </div>
  );
};
