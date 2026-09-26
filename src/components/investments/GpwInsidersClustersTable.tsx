import { FC } from 'react';
import { GpwInsiderCluster } from '../../lib/investments/gpwInsidersService';

interface Props {
  clusters: GpwInsiderCluster[];
  onSelectTicker?: (ticker: string) => void;
}

export const GpwInsidersClustersTable: FC<Props> = ({ clusters, onSelectTicker }) => {
  return (
    <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      {/* Title & Criteria */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
          Klastry zakupów z ostatnich 90 dni
        </h2>
        <span className="text-3xs font-mono text-text-muted">
          co najmniej dwóch insiderów, do 14 dni od siebie
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-custom/50 text-3xs uppercase font-mono tracking-wider text-text-muted">
              <th className="pb-2.5 font-semibold">Spółka</th>
              <th className="pb-2.5 font-semibold text-center">Kupujących</th>
              <th className="pb-2.5 font-semibold text-center">Transakcji</th>
              <th className="pb-2.5 font-semibold text-right">Łączna wartość</th>
              <th className="pb-2.5 font-semibold text-center">Okno dat</th>
              <th className="pb-2.5 font-semibold pl-4">Kto (Odblokowane)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {clusters.map((c) => (
              <tr key={c.id} className="hover:bg-primary/5 transition-colors">
                {/* Spółka */}
                <td className="py-2.5 font-mono">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTicker?.(c.ticker)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectTicker?.(c.ticker)}
                    className="font-bold text-primary hover:underline cursor-pointer mr-2"
                  >
                    {c.ticker}
                  </span>
                  <span className="text-text-secondary text-3xs">{c.companyName}</span>
                </td>

                {/* Kupujących */}
                <td className="py-2.5 text-center font-mono font-bold text-success">
                  {c.buyersCount}
                </td>

                {/* Transakcji */}
                <td className="py-2.5 text-center font-mono text-text-primary">
                  {c.tradesCount}
                </td>

                {/* Łączna wartość */}
                <td className="py-2.5 text-right font-mono text-text-muted">
                  {c.totalValueFormatted}
                </td>

                {/* Okno dat */}
                <td className="py-2.5 text-center font-mono text-3xs text-text-secondary whitespace-nowrap">
                  {c.dateRange}
                </td>

                {/* Kto — UNLOCKED */}
                <td className="py-2.5 pl-4 text-3xs text-text-primary">
                  <div className="flex flex-wrap gap-1 items-center">
                    {c.insiders.map((name, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-primary/10 text-text-primary border border-primary/20 font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note: Największe pojedyncze zakupy */}
      <div className="pt-2 border-t border-border-custom/40 text-3xs font-mono text-text-secondary flex flex-wrap gap-2 items-center">
        <span className="font-semibold text-text-primary">Największe pojedyncze zakupy (90 dni):</span>
        <span className="text-primary font-bold">ZAB</span>
        <span className="text-text-muted">(Tomasz Suchański · 14,2 mln zł)</span>
        <span>·</span>
        <span className="text-primary font-bold">SCW</span>
        <span className="text-text-muted">(Wojciech Sypniewski · 8,4 mln zł)</span>
        <span>·</span>
        <span className="text-primary font-bold">ICE</span>
        <span className="text-text-muted">(Piotr Bieliński · 5,1 mln zł)</span>
        <span>·</span>
        <span className="text-primary font-bold">ROB</span>
        <span className="text-text-muted">(Zbigniew Okoński · 3,8 mln zł)</span>
      </div>
    </div>
  );
};
