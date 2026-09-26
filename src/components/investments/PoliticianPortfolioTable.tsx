import { FC } from 'react';
import { CompanyLogo } from './CompanyLogo';
import type { PoliticianDetail } from '../../lib/investments/congressService';

interface Props {
  portfolio: PoliticianDetail['portfolio'];
  onSelectStock?: (ticker: string) => void;
}

const formatUsd = (val: number) => {
  if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1).replace('.', ',')} tys USD`;
  return `${val.toLocaleString()} USD`;
};

export const PoliticianPortfolioTable: FC<Props> = ({ portfolio, onSelectStock }) => {
  if (portfolio.length === 0) return null;
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-custom/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Portfel hipotetyczny: Kupna z ujawnień
        </h3>
        <p className="text-2xs text-text-muted mt-0.5">
          Szacowane pozycje na podstawie bilansu ujawnień (waga = środek przedziału kwoty)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
            <tr>
              <th className="py-2.5 px-4">Spółka</th>
              <th className="py-2.5 px-4 text-right">Szacowany wolumen</th>
              <th className="py-2.5 px-4 text-center">Transakcje</th>
              <th className="py-2.5 px-4 text-right">Udział</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
            {portfolio.slice(0, 10).map((h) => (
              <tr
                key={h.ticker}
                className="hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                onClick={() => onSelectStock && onSelectStock(h.ticker)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo ticker={h.ticker} name={h.companyName} size={24} />
                    <div>
                      <div className="font-bold text-text-primary">{h.ticker}</div>
                      <div className="text-3xs text-text-muted font-normal">{h.companyName}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-text-primary font-bold tabular-nums">
                  {formatUsd(h.estimatedValueUsd)}
                </td>
                <td className="py-3 px-4 text-center text-text-muted tabular-nums">
                  {h.tradesCount}×
                </td>
                <td className="py-3 px-4 text-right text-primary font-bold tabular-nums">
                  {h.weightPct.toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
