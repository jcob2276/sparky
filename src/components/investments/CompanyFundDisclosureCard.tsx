import type { FC } from 'react';
import type { CompanyFundHistoryPoint } from '../../lib/investments/companyDetailService';

export const CompanyFundDisclosureCard: FC<{ ticker: string; history?: CompanyFundHistoryPoint[] }> = ({ ticker, history = [] }) => (
  <section className="bg-surface-elevated border border-border-custom rounded-2xl p-5 space-y-2">
    <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
      Historia pozycji 13F · {ticker}
    </h3>
    {history.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead><tr className="text-text-muted">
            <th className="py-2 whitespace-nowrap">Stan na</th><th>Fundusze w odczycie</th><th>Raportowane akcje</th><th>Wartość USD</th><th>Dokumenty SEC</th>
          </tr></thead>
          <tbody>{history.map(row => (
            <tr key={row.period_of_report} className="border-t border-border-custom">
              <td className="py-3 font-mono whitespace-nowrap">{row.period_of_report}</td>
              <td>{row.reported_holders.toLocaleString('pl-PL')}</td>
              <td>{row.reported_shares.toLocaleString('pl-PL')}</td>
              <td>{row.reported_value_usd.toLocaleString('pl-PL')}</td>
              <td className="min-w-48 max-w-xs">{!!row.summary_warnings?.length && <p className="text-xs text-text-muted">Raporty z rozbieżnością: {row.summary_warnings.length}</p>}
                <details><summary className="cursor-pointer text-primary">Źródła ({row.source_urls.length})</summary>
                <p className="text-text-muted">Najnowsze zgłoszenie: {row.latest_filing_date}</p>
                <div className="max-h-40 overflow-y-auto">
                  {row.source_urls.map((url,index) => <a className="block underline text-primary" key={url} href={url} target="_blank" rel="noreferrer">Dokument {index+1}</a>)}
                </div>
                {row.summary_warnings?.map(warning => <p className="mt-2 text-xs text-text-muted max-w-xs" key={warning.source_url}>
                  <a className="underline text-primary" href={warning.source_url} target="_blank" rel="noreferrer">Cały raport funduszu</a>:
                  {' '}suma pozycji {warning.computed_total_usd.toLocaleString('pl-PL')} USD;
                  {' '}zgłoszone podsumowanie {warning.reported_total_usd.toLocaleString('pl-PL')} USD;
                  {' '}różnica {warning.difference_usd.toLocaleString('pl-PL')} USD. Wartości pozycji zachowano bez zmian.
                </p>)}
              </details></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    ) : <p className="text-xs text-text-secondary">Brak zweryfikowanej historii pozycji tej spółki według kwartałów.</p>}
    <p className="text-2xs text-text-muted">
      Wyłącznie odczytane dokumenty SEC; import historii trwa, więc pokrycie okresów może się różnić.
      Opcje i nominały obligacji są pominięte. Wartość posiadanych akcji nie jest kwotą zakupów lub sprzedaży.
    </p>
  </section>
);
