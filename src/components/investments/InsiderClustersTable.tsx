import { FC } from 'react';
import { InsiderClusterItem } from '../../lib/investments/insidersService';

interface Props {
  clusters: InsiderClusterItem[];
  topSinglePurchases: string;
  onSelectTicker?: (ticker: string) => void;
}

export const InsiderClustersTable: FC<Props> = ({
  clusters,
  topSinglePurchases,
  onSelectTicker,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
          Klastry zakupów z ostatnich 90 dni
        </h3>
        <p className="text-3xs sm:text-xs text-text-secondary mt-1">
          Spółki, w których co najmniej dwóch insiderów kupowało w odstępie do 14 dni. Fakt o danych, nie rekomendacja.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-custom/40 text-3xs font-mono uppercase tracking-wider text-text-muted">
              <th className="py-2.5 px-3 font-semibold">Spółka</th>
              <th className="py-2.5 px-3 font-semibold text-right">Kupujących</th>
              <th className="py-2.5 px-3 font-semibold text-right">Transakcji</th>
              <th className="py-2.5 px-3 font-semibold text-right">Łączna Wartość</th>
              <th className="py-2.5 px-3 font-semibold text-right">Okno Dat</th>
              <th className="py-2.5 px-3 font-semibold">Kto (Insiderzy)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30 text-xs font-mono">
            {clusters.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-surface-elevated/40 transition-colors group"
              >
                {/* Spółka */}
                <td className="py-3 px-3">
                  <div
                    onClick={() => onSelectTicker?.(c.ticker)}
                    className={onSelectTicker ? 'cursor-pointer' : ''}
                  >
                    <div className="font-bold text-text-primary group-hover:text-primary transition-colors">
                      {c.ticker}
                    </div>
                    <div className="text-3xs text-text-muted truncate max-w-48 sm:max-w-64">
                      {c.companyName}
                    </div>
                  </div>
                </td>

                {/* Kupujących */}
                <td className="py-3 px-3 text-right font-black text-success text-sm sm:text-base">
                  {c.buyersCount}
                </td>

                {/* Transakcji */}
                <td className="py-3 px-3 text-right font-bold text-text-primary">
                  {c.tradesCount}
                </td>

                {/* Łączna wartość (Unblurred!) */}
                <td className="py-3 px-3 text-right font-bold text-text-primary">
                  {c.totalValueFormatted}
                </td>

                {/* Okno dat */}
                <td className="py-3 px-3 text-right text-success/90 font-medium">
                  {c.dateRange}
                </td>

                {/* Kto (Unblurred real names!) */}
                <td className="py-3 px-3 text-text-secondary text-2xs truncate max-w-48 sm:max-w-64">
                  {c.insiderNames.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: Największe pojedyncze zakupy (Unblurred!) */}
      <div className="pt-3 border-t border-border-custom/40 text-3xs font-mono text-text-secondary">
        <span className="font-bold text-text-primary">Największe pojedyncze zakupy (90 dni):</span>{' '}
        <span className="text-text-muted">{topSinglePurchases}</span>
      </div>
    </div>
  );
};
