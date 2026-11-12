import { useMemo } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { detectPriceHikes, forecastBalance, type RecurringPayment } from '@vanguard/domain';
import { getTodayWarsaw, formatWarsawDate } from '../../../lib/date';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { FinanceList, FinanceRow, FinanceSection } from '../financeUi';

interface Props { balance: number; currency: string; recurring: RecurringPayment[] }

/** Saldo za 30 dni, gdyby zeszły tylko wykryte stałe płatności, plus najbliższe terminy i podwyżki cen. */
export function BankForecast({ balance, currency, recurring }: Props) {
  const today = getTodayWarsaw();
  const forecast = useMemo(() => forecastBalance(balance, today, 30, recurring), [balance, today, recurring]);
  const hikes = useMemo(() => detectPriceHikes(recurring), [recurring]);
  if (!forecast.payments.length) return null;
  const upcoming = forecast.payments.filter(p => p.date <= forecast.points[14].date).slice(0, 4);
  const end = forecast.points.at(-1)!.balance;

  return (
    <FinanceSection title="Saldo za 30 dni" footer="Tylko wykryte stałe płatności; zakupy w sklepie nie są przewidywane.">
      <div className="space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-text-muted">Po stałych płatnościach</span>
          <span className={`text-lg font-semibold tabular-nums ${end < 0 ? 'text-danger' : 'text-text-primary'}`}>{formatCurrency(end, currency)}</span>
        </div>
        <div className="h-24" role="img" aria-label="Prognoza salda na 30 dni">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 96 }}>
            <AreaChart data={forecast.points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[(min: number) => Math.min(min, 0), 'dataMax']} />
              <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="4 4" />
              <Area type="stepAfter" dataKey="balance" stroke="var(--primary)" strokeWidth={2} strokeDasharray="5 4" fill="var(--primary)" fillOpacity={0.1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {forecast.firstNegative && (
          <p role="alert" className="text-sm text-danger">Saldo spadnie poniżej zera około {formatWarsawDate(forecast.firstNegative.date)}.</p>
        )}
        {hikes.map(h => (
          <p key={h.name} className="text-sm text-warning">{h.name}: podwyżka z {formatCurrency(h.from, currency)} do {formatCurrency(h.to, currency)} (+{Math.round(h.pct * 100)}%).</p>
        ))}
      </div>
      {upcoming.length > 0 && (
        <FinanceList>
          {upcoming.map((p, i) => (
            <FinanceRow key={`${p.date}-${p.name}-${i}`} primary={p.name} secondary={formatWarsawDate(p.date)} trailing={`−${formatCurrency(p.amount, currency)}`} />
          ))}
        </FinanceList>
      )}
    </FinanceSection>
  );
}
