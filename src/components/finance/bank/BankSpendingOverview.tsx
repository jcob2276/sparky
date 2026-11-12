import type { analyzeBankPeriod } from '../../../lib/finance/bankAnalytics';
import Button from '../../ui/Button';
import { FinanceEmpty, FinanceSection } from '../financeUi';
import { BankSpendingSummary } from '../BankSpendingSummary';
import { BankChanges } from './BankChanges';
import type { CategorySpending } from '../../../lib/finance/bankSpending';

interface Props {
  report: ReturnType<typeof analyzeBankPeriod>;
  previousSpending?: CategorySpending[];
  currency: string;
  month?: string;
  loading: boolean;
  error?: string;
  hasAccounts: boolean;
  onOpenDetails?: () => void;
  onManageAccounts?: () => void;
}

export function BankSpendingOverview({ report, previousSpending, currency, month, loading, error, hasAccounts, onOpenDetails, onManageAccounts }: Props) {
  return <FinanceSection title="Kategorie wydatków" subtitle={`Z banku · ${month || 'cała historia'} · ${currency}`}>
    {error ? <p role="alert" className="p-4 text-sm text-danger">{error}</p>
      : loading ? <FinanceEmpty>Wczytuję wydatki…</FinanceEmpty>
      : hasAccounts ? <BankSpendingSummary spending={report.spending} currency={currency} limit={5} />
      : <FinanceEmpty>Połącz rachunek, żeby zobaczyć, na co wychodzą pieniądze.</FinanceEmpty>}
    {hasAccounts && previousSpending && <BankChanges current={report.spending} previous={previousSpending} currency={currency} />}
    {hasAccounts && onOpenDetails && <div className="border-t border-border-custom/20 p-3"><Button variant="ghost" className="w-full" onClick={onOpenDetails}>Pełna analiza i historia</Button></div>}
    {!hasAccounts && onManageAccounts && <div className="p-3"><Button variant="outline" className="w-full" onClick={onManageAccounts}>Przejdź do ustawień finansów</Button></div>}
  </FinanceSection>;
}
