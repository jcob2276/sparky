import type { UsFinancialReport } from '../../lib/investments/usFinancialReports';
import { formatLongDateWarsaw } from '../../lib/date';

const labels = [['revenue', 'Przychody'], ['net_profit', 'Wynik netto'], ['assets', 'Aktywa'],
  ['equity', 'Kapitał własny'], ['operating_cash_flow', 'Przepływy operacyjne'],
  ['ppe_purchases', 'Zakupy rzeczowych aktywów trwałych']] as const;
const money = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

export function CompanyFinancialReportsCard({ reports }: { reports: UsFinancialReport[] }) {
  return <section className="bg-surface-elevated border border-border-custom rounded-2xl p-5 space-y-3">
    <h3 className="font-semibold text-text-primary">Raporty finansowe · SEC</h3>
    {!reports.length ? <p className="text-sm text-text-muted">Brak zaimportowanego raportu finansowego ze standardowymi danymi SEC dla tej spółki.</p>
      : <>
        <p className="text-xs text-text-muted">Wyniki dotyczą podanego okresu. Raporty 10-Q mogą zawierać dane narastająco od początku roku; aktywa i kapitał pokazują stan na koniec okresu.</p>
        {reports.map((report, index) => <details key={report.accession} open={index === 0} className="border-t border-border-custom pt-3">
          <summary className="cursor-pointer text-sm text-text-primary">{report.form} · {formatLongDateWarsaw(report.periodStart)}–{formatLongDateWarsaw(report.periodEnd)}</summary>
          <p className="text-xs text-text-muted my-2">Publikacja: {formatLongDateWarsaw(report.publicationDate)} · mln {report.currency}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {labels.map(([key, label]) => <div key={key} className="flex justify-between gap-3">
              <dt className="text-text-muted">{label}</dt>
              <dd className="tabular-nums text-text-primary">{report.metrics[key] == null ? '—' : money.format(report.metrics[key] / 1e6)}</dd>
            </div>)}
          </dl>
          <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-primary underline">Oficjalny raport SEC</a>
        </details>)}
      </>}
  </section>;
}
