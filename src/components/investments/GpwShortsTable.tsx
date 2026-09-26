import { FC } from 'react';
import { GpwShortCompany } from '../../lib/investments/gpwShortsService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  companies: GpwShortCompany[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export const GpwShortsTable: FC<Props> = ({
  companies,
  selectedTicker,
  onSelectTicker,
}) => {
  return (
    <div className="overflow-x-auto border border-border-custom/60 rounded-2xl bg-surface/40">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-surface text-3xs font-semibold uppercase text-text-muted border-b border-border-custom/50">
          <tr>
            <th className="py-2.5 px-3">Spółka</th>
            <th className="py-2.5 px-3 text-right">Łączny short</th>
            <th className="py-2.5 px-3 text-right">Pozycje &ge;0,5%</th>
            <th className="py-2.5 px-3 text-left">Największa pozycja</th>
            <th className="py-2.5 px-3 text-right">Ostatnia zmiana</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-custom/30">
          {companies.map((c) => {
            const isSelected = selectedTicker === c.ticker;
            return (
              <tr
                key={c.ticker}
                onClick={() => onSelectTicker(c.ticker)}
                className={`transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-primary/10 hover:bg-primary/15'
                    : 'hover:bg-surface-elevated/40'
                }`}
              >
                {/* Spółka: Logo + Ticker */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo ticker={c.ticker} name={c.companyName} size={28} />
                    <span className="font-bold text-text-primary group-hover:text-primary transition-colors text-xs sm:text-sm">
                      {c.ticker}
                    </span>
                  </div>
                </td>

                {/* Łączny short */}
                <td className="py-3 px-3 text-right font-black font-mono text-xs sm:text-sm text-danger">
                  {c.totalPct > 0 ? `${c.totalPct.toFixed(2)}%` : '0.00%'}
                </td>

                {/* Pozycje >= 0.5% */}
                <td className="py-3 px-3 text-right font-medium text-text-primary font-mono text-xs">
                  {c.publicHoldersCount}
                </td>

                {/* Największa pozycja */}
                <td className="py-3 px-3 text-left text-text-secondary text-2xs truncate max-w-44 sm:max-w-56">
                  {c.topHolder}
                </td>

                {/* Ostatnia zmiana */}
                <td className="py-3 px-3 text-right text-text-muted font-mono text-2xs">
                  {c.lastChange}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
