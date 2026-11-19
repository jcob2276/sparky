import { Pressable } from '../ui/ControlPrimitives';
import type { FinanceBundle, FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import type { FinanceMetrics } from './useFinanceMetrics';
import { financePeriodTotals } from './financeReferencePeriods';
import { FinanceReferenceCategories, FinanceReferenceHistory } from './FinanceReferenceViews';

export default function FinanceReferenceStart({ data, metrics, month, onPortfolio, onAccounts, onTransactions, onSelect }: {
  data: FinanceBundle;
  metrics: FinanceMetrics | null;
  month: string;
  onPortfolio: () => void;
  onAccounts: () => void;
  onTransactions: (category?: string) => void;
  onSelect: (record: FinanceTransaction) => void;
}) {
  const records = data.transactions.filter((tx) => tx.transaction_date.startsWith(month));
  const { income, expenses, refunds, balance } = financePeriodTotals(records);
  const accounts = data.accounts.filter((account) => account.account_type !== 'broker_cash');
  return (
    <div className="finance-reference-start">
      <section className="finance-reference-card finance-reference-worth">
        <header><h2 className="finance-reference-label">Wartość netto</h2><Pressable className="finance-reference-link" type="button" onClick={onPortfolio}>Zarządzaj majątkiem ↗</Pressable></header>
        <p className="finance-reference-number">{metrics ? formatPln(metrics.netWorth, 2) : '—'}</p>
        <p className="text-sm text-text-muted">Środki na kontach, gotówka i inwestycje</p>
        {metrics && <dl className="finance-reference-breakdown">
          <div><dt>Środki na kontach i gotówka</dt><dd>{formatPln(metrics.liquid, 2)}</dd></div>
          <div><dt>Inwestycje</dt><dd>{formatPln(metrics.investments, 2)}</dd></div>
          {metrics.savingsCash > 0 && <div><dt>W tym oszczędności</dt><dd>{formatPln(metrics.savingsCash, 2)}</dd></div>}
        </dl>}
      </section>
      <section className="finance-reference-card">
        <header><h2 className="finance-reference-label">Konta</h2><Pressable className="finance-reference-link" type="button" onClick={onAccounts}>Zarządzaj</Pressable></header>
        {accounts.length ? <dl className="finance-reference-breakdown">{accounts.map((account) => (
          <div key={account.id}><dt>{account.name}</dt><dd>{formatPln(account.balance, 2)}</dd></div>
        ))}</dl> : <p className="text-sm text-text-muted">Dodaj konto w ustawieniach finansów.</p>}
      </section>
      <FinanceReferenceCategories transactions={records} onCategory={onTransactions} />
      <section className="finance-reference-card">
        <h2 className="finance-reference-label">Cashflow</h2>
        <p className={`finance-reference-number ${balance >= 0 ? 'finance-reference-positive' : ''}`}>{balance > 0 ? '+' : ''}{formatPln(balance, 2)}</p>
        {income > 0 && <p className="text-sm text-text-muted">Stopa oszczędzania {Math.round(balance / income * 100)}%</p>}
        <dl className="finance-reference-breakdown"><div><dt>Wpływy</dt><dd>{formatPln(income, 2)}</dd></div><div><dt>Wydatki</dt><dd>{formatPln(expenses, 2)}</dd></div>
          {refunds > 0 && <div><dt>Zwroty</dt><dd>{formatPln(refunds, 2)}</dd></div>}</dl>
      </section>
      <section className="finance-reference-card">
        <header><h2 className="finance-reference-label">Ostatnie operacje</h2><Pressable type="button" className="finance-reference-link" onClick={() => onTransactions()}>Wszystkie transakcje ›</Pressable></header>
        {records.length ? <FinanceReferenceHistory records={records.slice(0, 5)} accounts={data.accounts} onSelect={onSelect} />
          : <p className="text-sm text-text-muted">Brak transakcji w tym miesiącu.</p>}
      </section>
    </div>
  );
}
