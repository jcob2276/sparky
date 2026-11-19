import { useState } from 'react';
import { Switch } from '../ui/Switch';
import { FinanceEmergencyCard } from './FinanceEmergencyCard';
import { Pressable } from '../ui/ControlPrimitives';
import type { FinanceBundle, FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import type { FinanceMetrics } from './useFinanceMetrics';
import { financePeriodTotals } from './financeReferencePeriods';
import { FinanceReferenceCategories, FinanceReferenceHistory } from './FinanceReferenceViews';

export default function FinanceReferenceStart({ data, metrics, portfolioValue, month, onPortfolio, onAccounts, onTransactions, onSelect }: {
  data: FinanceBundle;
  metrics: FinanceMetrics | null;
  portfolioValue: number;
  month: string;
  onPortfolio: () => void;
  onAccounts: () => void;
  onTransactions: (category?: string) => void;
  onSelect: (record: FinanceTransaction) => void;
}) {
  const [includeSavings, setIncludeSavings] = useState(false);
  const savings = metrics?.savingsCash ?? 0;
  const liquidSavings = data.accounts.filter((account) => account.account_type === 'savings' && account.is_liquid)
    .reduce((sum, account) => sum + account.balance, 0);
  const brokerCash = data.accounts.filter((account) => account.account_type === 'broker_cash')
    .reduce((sum, account) => sum + account.balance, 0);
  const totalPortfolio = portfolioValue + brokerCash;
  const otherInvestments = metrics ? metrics.investments - totalPortfolio - (savings - liquidSavings) : 0;
  const records = data.transactions.filter((tx) => tx.transaction_date.startsWith(month));
  const { income, expenses, refunds, balance } = financePeriodTotals(records);
  const accounts = data.accounts.filter((account) => account.account_type !== 'broker_cash');
  return (
    <div className="finance-reference-start">
      <section className="finance-reference-card finance-reference-worth" aria-label="Wartość netto">
        <header><h2 className="finance-reference-label">Aktualna wartość netto</h2><Pressable className="finance-reference-link" type="button" onClick={onPortfolio}>Zarządzaj majątkiem ↗</Pressable></header>
        <p className="finance-reference-number">{metrics ? formatPln(metrics.netWorth - (includeSavings ? 0 : savings), 2) : '—'}</p>
        {metrics && (
          <>
            <p className="text-sm text-text-muted">
              {savings !== 0 && !includeSavings ? 'Majątek bez oszczędności' : 'Środki na kontach, gotówka i inwestycje'}
            </p>
            <dl className="finance-reference-breakdown">
              <div><dt>Środki na kontach i gotówka</dt><dd>{formatPln(metrics.liquid - liquidSavings, 2)}</dd></div>
              <div><dt><Pressable className="finance-reference-link" type="button" onClick={onPortfolio}>Portfel XTB</Pressable></dt><dd>{formatPln(totalPortfolio, 2)}</dd></div>
              {Math.abs(otherInvestments) >= 0.005 && <div><dt>Pozostałe inwestycje</dt><dd>{formatPln(otherInvestments, 2)}</dd></div>}
              {includeSavings && savings !== 0 && <div><dt>Oszczędności</dt><dd>{formatPln(savings, 2)}</dd></div>}
            </dl>
            {savings !== 0 && <Switch label="Uwzględnij oszczędności" checked={includeSavings} onChange={(event) => setIncludeSavings(event.target.checked)} />}
          </>
        )}
      </section>
      {metrics && <div className="finance-reference-card p-0"><FinanceEmergencyCard metrics={metrics} /></div>}
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
