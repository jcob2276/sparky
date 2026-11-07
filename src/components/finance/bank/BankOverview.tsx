import type { analyzeBankPeriod } from '../../../lib/finance/bankAnalytics';
import { formatCurrency } from '../../../lib/finance/formatMoney';

interface Props {
  report: ReturnType<typeof analyzeBankPeriod>;
  currency: string;
  comparison: { expenses: number; count: number } | null;
}

export function BankOverview({ report, currency, comparison }: Props) {
  const amount = (value: number) => report.count ? formatCurrency(value, currency) : '—';
  return (
    <div className="space-y-4 p-4" aria-label="Podsumowanie okresu">
      <div>
        <p className="text-sm text-text-muted">Bilans wpływów i wydatków</p>
        <p className="mt-1 break-words text-3xl font-semibold tabular-nums tracking-tight">{amount(report.result)}</p>
        <p className="mt-1 text-xs text-text-muted">Wpływy − wydatki + zwroty · {report.count} zaksięgowanych transakcji. To wynik okresu, a nie saldo rachunku.</p>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[['Wpływy', report.income], ['Wydatki', report.expenses], ['Zwroty', report.refunds]].map(([label, value]) => (
          <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{amount(Number(value))}</dd></div>
        ))}
      </dl>
      <p className="text-xs leading-relaxed text-text-muted">Poza kosztami życia: własne transfery {amount(report.transfers)}, inwestycje {amount(report.investments)}, gotówka {amount(report.cash)}. Kwoty ze znakiem pokazują kierunek ruchu. Zwroty pozostają osobną pozycją.</p>
      {report.pendingCount > 0 && <p className="text-sm text-text-muted">Poza wykonaniem: {report.pendingCount} pozycji.</p>}
      {comparison ? <p className="text-sm text-text-secondary">Poprzedni porównywalny okres: wydatki {formatCurrency(comparison.expenses, currency)} · {comparison.count} transakcji. Zmiana: {formatCurrency(report.expenses - comparison.expenses, currency)}.</p>
        : <p className="text-xs text-text-muted">Porównanie okresów pojawi się po potwierdzeniu pełnego zakresu historii.</p>}
    </div>
  );
}
