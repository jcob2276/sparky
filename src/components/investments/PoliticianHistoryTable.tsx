import { FC } from 'react';
import { CompanyLogo } from './CompanyLogo';
import type { PoliticianDetail } from '../../lib/investments/congressService';

interface Props {
  transactions: PoliticianDetail['transactions'];
  onSelectStock?: (ticker: string) => void;
}

export const PoliticianHistoryTable: FC<Props> = ({
  transactions,
  onSelectStock,
}) => {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-custom/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Ostatnie transakcje ({transactions.length})
        </h3>
        <p className="text-2xs text-text-muted mt-0.5">
          Pełna historia transakcji z formularzy STOCK Act (dostępna w całości, bez paywalli)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
            <tr>
              <th className="py-2.5 px-4">Data Transakcji</th>
              <th className="py-2.5 px-4">Spółka</th>
              <th className="py-2.5 px-4 text-center">Typ</th>
              <th className="py-2.5 px-4 text-right">Przedział Kwoty</th>
              <th className="py-2.5 px-4">Data Ujawnienia</th>
              <th className="py-2.5 px-4 text-right">Opóźnienie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 px-4 text-text-primary">{t.transactionDate}</td>
                <td
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => t.ticker && t.ticker !== '—' && onSelectStock && onSelectStock(t.ticker)}
                >
                  <div className="flex items-center gap-2">
                    {t.ticker !== '—' && <CompanyLogo ticker={t.ticker} name={t.companyName} size={20} />}
                    <span className="font-bold text-text-primary hover:text-primary transition-colors">
                      {t.ticker}
                    </span>
                    <span className="text-3xs text-text-muted truncate max-w-40">{t.companyName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-sans">
                  <span
                    className={`px-2 py-0.5 rounded-md text-3xs font-semibold uppercase tracking-wider border border-border-custom ${
                      t.type === 'buy' ? 'text-success bg-surface-subtle' : 'text-danger bg-surface-subtle'
                    }`}
                  >
                    {t.type === 'buy' ? 'Kupno' : 'Sprzedaż'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-text-primary font-bold tabular-nums">
                  {t.amountLabel}
                </td>
                <td className="py-3 px-4 text-text-muted">{t.disclosureDate}</td>
                <td className={`py-3 px-4 text-right tabular-nums font-bold ${
                  t.delayDays >= 30 ? 'text-danger' : 'text-text-muted'
                }`}>
                  {t.delayDays} DNI
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
