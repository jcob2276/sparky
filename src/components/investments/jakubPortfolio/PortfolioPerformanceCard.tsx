import { FC } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import { usePortfolioPerformance } from '../../../lib/investments/usePortfolioPerformance';
import { PORTFOLIO_BENCHMARK } from '../../../lib/investments/portfolioPerformance';
import { currentYear } from '../../../lib/investments/yearFloor';
import { formatShortDateWarsaw } from '../../../lib/date';
import { Card } from '../../ui/Card';
import Skeleton from '../../ui/Skeleton';

interface Props {
  scope: 'jakub' | 'kondzio';
  positions: PortfolioPosition[];
}

const signed = (n: number, digits = 2) => `${n > 0 ? '+' : ''}${n.toFixed(digits).replace('.', ',')}`;
const tone = (n: number | null) => n == null ? 'text-text-muted' : n < 0 ? 'text-danger' : 'text-success';

function Stat({ label, value, hint, valueClass }: { label: string; value: string; hint?: string; valueClass: string }) {
  return (
    <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-0.5">
      <div className="text-2xs font-mono text-text-muted">{label}</div>
      <div className={`text-lg font-semibold font-mono tabular-nums ${valueClass}`}>{value}</div>
      {hint && <div className="text-2xs text-text-muted">{hint}</div>}
    </div>
  );
}

/** Zmiana dzienna oraz wynik od 1 stycznia vs SPY — z `prices_daily` (zwrot cenowy, waluta notowania). */
export const PortfolioPerformanceCard: FC<Props> = ({ scope, positions }) => {
  const { data, isPending, error } = usePortfolioPerformance(scope, positions);
  const bars = data ? [
    { label: 'Portfel', value: data.ytdPct, strong: true },
    { label: PORTFOLIO_BENCHMARK, value: data.benchmarkYtdPct, strong: false },
  ] : [];
  const scale = Math.max(1, ...bars.map(b => Math.abs(b.value ?? 0)));
  const movers = (data?.positions ?? []).filter(p => p.ytdPct != null).sort((a, b) => b.ytdPct! - a.ytdPct!);
  return (
    <Card padding="1.25rem" className="space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary tracking-tight">Wynik {currentYear()} vs benchmark</h3>
        <p className="text-2xs text-text-muted">Dane od 1 stycznia {currentYear()} · źródło: notowania dzienne z bazy (zwrot cenowy, bez FX i dywidend, stały skład)</p>
      </div>
      {isPending && <Skeleton variant="stat" />}
      {error && <p role="alert" className="text-xs text-danger">Nie udało się pobrać notowań: {error.message}</p>}
      {data && (data.ytdPct == null && data.dayPct == null ? (
        <p role="status" className="text-xs text-text-secondary">
          Brak notowań dla pozycji tego portfela w bazie od 1 stycznia {currentYear()}. Wynik pojawi się po pierwszym imporcie cen.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat label="Dziś" valueClass={tone(data.dayPct)} value={data.dayPct == null ? '—' : `${signed(data.dayPct)}%`}
              hint={data.dayPln == null ? 'brak poprzedniej sesji' : `${signed(data.dayPln, 0)} zł`} />
            <Stat label={`YTD ${currentYear()}`} valueClass={tone(data.ytdPct)} value={data.ytdPct == null ? '—' : `${signed(data.ytdPct)}%`}
              hint={data.baselineDate ? `od ${formatShortDateWarsaw(data.baselineDate)}` : undefined} />
            <Stat label={`${PORTFOLIO_BENCHMARK} YTD`} valueClass="text-text-primary"
              value={data.benchmarkYtdPct == null ? '—' : `${signed(data.benchmarkYtdPct)}%`} hint="ETF S&P 500, USD" />
            <Stat label="Alfa vs SPY" valueClass={tone(data.alphaPp)} value={data.alphaPp == null ? '—' : `${signed(data.alphaPp, 1)} pp`}
              hint={`pokrycie ${data.coveragePct.toFixed(0)}% wartości`} />
          </div>
          <div className="space-y-1.5" role="img"
            aria-label={`Wynik od początku roku: ${bars.map(b => `${b.label} ${b.value == null ? 'brak danych' : signed(b.value) + '%'}`).join(', ')}`}>
            {bars.map(b => (
              <div key={b.label} className="flex items-center gap-2 text-2xs font-mono">
                <span className="w-14 text-text-muted">{b.label}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-elevated overflow-hidden">
                  {b.value != null && <div className={`h-full rounded-full ${b.strong ? (b.value < 0 ? 'bg-danger' : 'bg-primary') : 'bg-text-muted'}`}
                    style={{ width: `${Math.max(2, Math.abs(b.value) / scale * 100)}%` }} />}
                </div>
                <span className="w-16 text-right tabular-nums text-text-secondary">{b.value == null ? '—' : `${signed(b.value, 1)}%`}</span>
              </div>
            ))}
          </div>
          {movers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movers.map(m => (
                <span key={m.id} className="px-2 py-0.5 rounded-md border border-border-custom bg-surface text-2xs font-mono tabular-nums">
                  <span className="text-text-primary font-semibold">{m.ticker}</span>{' '}
                  <span className={tone(m.ytdPct)}>{signed(m.ytdPct!, 1)}%</span>
                </span>
              ))}
            </div>
          )}
          {data.asOf && <p className="text-2xs text-text-muted">Ostatnia sesja: {formatShortDateWarsaw(data.asOf)}.
            {data.coveragePct < 100 && ' Pozycje bez notowań w bazie są pominięte.'}</p>}
        </>
      ))}
    </Card>
  );
};
