import { FC } from 'react';
import { EspiReport, GpwPeriod } from '../../lib/investments/publicMarket';
import { GpwYear } from '../../lib/investments/gpwStatements';
import { getMarketLinks } from '../../lib/investments/marketLinks';

interface Props {
  forecasts: EspiReport[];
  ticker: string | null;
  periods: GpwPeriod[];
  years: GpwYear[];
  ready: boolean;
}

export const GpwCompanyDetail: FC<Props> = ({ forecasts, ticker, periods, years, ready }) => (
  <>
    {forecasts.length > 0 && (
      <div className="border border-border-custom bg-surface p-3">
        <div className="text-3xs font-mono uppercase tracking-wider text-text-muted mb-2">Prognozy ogłoszone w ESPI</div>
        <ul className="space-y-1 text-xs">
          {forecasts.map((report) => (
            <li key={report.id}>
              <a href={report.sourceUrl || undefined} target="_blank" rel="noopener noreferrer" className="hover:underline">
                <span className="font-mono">{report.reportDate} {report.ticker}</span> {report.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
    {ticker && (
      <div className="border border-border-custom bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="text-xs font-mono font-bold">{ticker} · okresy ze źródła</div>
          <div className="flex items-center gap-1.5">
            {getMarketLinks(ticker, 'GPW').map((link) => (
              <a
                key={link.provider}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 rounded text-3xs font-mono font-medium bg-surface border border-border-custom text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
        {!ready ? (
          <p className="text-xs font-mono text-text-muted">Pobieram rachunek wyników…</p>
        ) : periods.length === 0 ? (
          <p className="text-xs text-text-secondary">Brak okresów dla {ticker}.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
              <div key={period.label} className="border border-border-custom px-2 py-1 text-3xs font-mono">
                <div>{period.label}</div>
                <div>przychód {period.revenue == null ? '—' : period.revenue.toLocaleString('pl-PL')}</div>
                <div>wynik {period.netIncome == null ? '—' : period.netIncome.toLocaleString('pl-PL')}</div>
              </div>
            ))}
          </div>
        )}
        {ready && years.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <div className="text-3xs font-mono text-text-muted mb-1">
              Rachunek wyników {years[0]?.year}–{years.at(-1)?.year}, tys. PLN
            </div>
            <table className="text-3xs font-mono">
              <thead>
                <tr>
                  <th className="px-2 text-left font-medium" />
                  {years.map((year) => (
                    <th key={year.year} className="px-2 text-right font-medium">{year.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pr-2 text-text-muted">Przychód</td>
                  {years.map((year) => (
                    <td key={year.year} className="px-2 text-right tabular-nums">
                      {year.revenue == null ? '—' : Math.round(year.revenue).toLocaleString('pl-PL')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="pr-2 text-text-muted">Zysk netto</td>
                  {years.map((year) => (
                    <td key={`${year.year}-n`} className="px-2 text-right tabular-nums">
                      {year.netIncome == null ? '—' : Math.round(year.netIncome).toLocaleString('pl-PL')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}
  </>
);
