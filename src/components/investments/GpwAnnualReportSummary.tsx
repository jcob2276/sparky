import type { GpwAnnualReport } from '../../lib/investments/gpwAnnualReportService';
import { formatLongDateWarsaw } from '../../lib/date';

export function GpwAnnualReportSummary({ report }: { report: GpwAnnualReport }) {
  const money = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
  const facts = [['Przychody', report.revenue], ['Zysk netto grupy', report.netProfit],
    ['Aktywa', report.assets], ['Kapitał własny', report.equity], ['Przepływy operacyjne', report.operatingCashFlow],
    ['FCF obliczony', report.freeCashFlow]] as const;
  return <details className="mt-1 text-xs" onClick={event => event.stopPropagation()}>
    <summary className="text-primary cursor-pointer">Raport roczny {report.periodEnd.slice(0, 4)}</summary>
    <div className="mt-2 space-y-1 min-w-80 whitespace-normal">
      <p>Skonsolidowany · {formatLongDateWarsaw(report.periodStart)}–{formatLongDateWarsaw(report.periodEnd)}</p>
      <p>Publikacja: {formatLongDateWarsaw(report.publicationDate)}</p>
      <dl>{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-3">
        <dt>{label}</dt><dd className="whitespace-nowrap">{value == null ? '—' : `${money.format(value / 1e6)} mln ${report.currency}`}</dd>
      </div>)}</dl>
      {report.freeCashFlow != null && <p className="text-text-muted text-3xs">FCF = przepływy operacyjne − zakupy rzeczowych aktywów i wartości niematerialnych.</p>}
      <a className="text-primary underline" href={report.sourceUrl} target="_blank" rel="noopener noreferrer">Oficjalny plik raportu</a>
    </div>
  </details>;
}
