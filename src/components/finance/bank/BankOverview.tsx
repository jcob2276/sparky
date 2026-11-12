import { ChevronDown } from 'lucide-react';
import type { analyzeBankPeriod } from '../../../lib/finance/bankAnalytics';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { Money } from '../FinanceMoney';

interface Props {
  report: ReturnType<typeof analyzeBankPeriod>;
  currency: string;
  comparison: { expenses: number; count: number } | null;
}

/**
 * Period summary in the same shape as the month card on Pulpit: the result, then Wpływy / Wydatki / Zwroty as rows.
 * The explanations (what is excluded, the previous period) are one tap away instead of a wall of text.
 */
export function BankOverview({ report, currency, comparison }: Props) {
  const amount = (value: number) => report.count ? formatCurrency(value, currency) : '—';
  const rows: Array<[string, number]> = [['Wpływy', report.income], ['Wydatki', report.expenses], ...(report.refunds ? [['Zwroty', report.refunds] as [string, number]] : [])];
  return (
    <div aria-label="Podsumowanie okresu">
      <div className="px-4 py-4">
        <p className="text-xs text-text-muted">Wynik okresu · {report.count} zaksięgowanych transakcji</p>
        <p className="mt-0.5 break-words text-4xl font-bold tracking-tight">{report.count ? <Money value={report.result} fractionDigits={2} currency={currency} /> : '—'}</p>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="ios-row-divider flex min-h-12 items-center px-4">
          <span className="flex-1 text-sm text-text-primary">{label}</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">{amount(value)}</span>
        </div>
      ))}
      <details className="ios-row-divider group px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
          Jak to liczymy
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2 pb-4 text-xs leading-relaxed text-text-muted">
          <p>Wynik = wpływy − wydatki + zwroty. To wynik okresu, a nie saldo rachunku.</p>
          <p>Poza kosztami życia: własne transfery {amount(report.transfers)}, inwestycje {amount(report.investments)}, gotówka {amount(report.cash)}. Zwroty pozostają osobną pozycją.</p>
          {report.pendingCount > 0 && <p>Poza wykonaniem: {report.pendingCount} pozycji.</p>}
          {comparison
            ? <p>Poprzedni porównywalny okres: wydatki {formatCurrency(comparison.expenses, currency)} · {comparison.count} transakcji. Zmiana: {formatCurrency(report.expenses - comparison.expenses, currency)}.</p>
            : <p>Porównanie okresów pojawi się po potwierdzeniu pełnego zakresu historii.</p>}
        </div>
      </details>
    </div>
  );
}
