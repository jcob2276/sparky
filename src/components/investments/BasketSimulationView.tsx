import { FC, useEffect, useState } from 'react';
import { fetchConvergenceSnapshot, ConvergenceSnapshot } from '../../lib/investments/publicDisclosures';
import { fetchBasketBacktest, BacktestPoint } from '../../lib/investments/publicMarket';

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace('.', ',')}%`;
}

function curve(points: BacktestPoint[]): string {
  const values = points.map((point) => point.cumulativePct);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  return points
    .map((point, index) => {
      const x = 8 + (index / Math.max(points.length - 1, 1)) * 624;
      const y = 12 + (1 - (point.cumulativePct - min) / span) * 140;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const BasketSimulationView: FC = () => {
  const [snapshot, setSnapshot] = useState<ConvergenceSnapshot | null>(null);
  const [history, setHistory] = useState<BacktestPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchConvergenceSnapshot(), fetchBasketBacktest()])
      .then(([live, points]) => {
        if (!active) return;
        setSnapshot(live);
        setHistory(points);
      })
      .catch(() => {
        if (!active) return;
        setSnapshot(null);
        setHistory([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const last = history.at(-1);

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      <div className="border border-border-custom bg-surface px-4 py-3">
        <div className="text-3xs font-mono uppercase tracking-wider text-text-muted">Koszyk zbieżności</div>
        <h2 className="text-lg font-bold tracking-tight">Backtest i bieżący kwartał</h2>
        <p className="text-xs text-text-secondary mt-1">
          Krzywa z publicznych punktów koszyka oraz osobny odczyt bieżącego kwartału.
          {last ? ` Ostatni punkt ${last.asof}, narastająco ${formatPct(last.cumulativePct)}.` : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div>Kwartał {loading ? '…' : snapshot ? formatPct(snapshot.returnPct) : '—'}</div>
          <div>Wycenione {snapshot ? `${snapshot.priced}/${snapshot.topN}` : '—'}</div>
          <div>Od {snapshot?.quarterStart || '—'}</div>
          <div>Do {snapshot?.valuedTo || '—'}</div>
        </div>
      </div>
      {history.length > 1 && (
        <svg viewBox="0 0 640 170" className="w-full h-40 bg-surface border border-border-custom">
          <path d={curve(history)} fill="none" className="stroke-success" strokeWidth="1.8" />
        </svg>
      )}
      {!loading && history.length === 0 && (
        <p className="text-xs text-text-secondary">Publiczny backtest koszyka jest pusty.</p>
      )}
      {history.length > 0 && (
        <table className="w-full text-xs font-mono border border-border-custom">
          <thead className="text-3xs uppercase text-text-muted">
            <tr>
              <th className="text-left px-2 py-1">Data</th>
              <th className="text-right px-2">Kwartał</th>
              <th className="text-right px-2">Narastająco</th>
              <th className="text-right px-2">Fundusze</th>
            </tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.asof} className="border-t border-border-custom/50">
                <td className="px-2 py-1">{point.asof}</td>
                <td className="px-2 text-right tabular-nums">{formatPct(point.periodPct)}</td>
                <td className="px-2 text-right tabular-nums">{formatPct(point.cumulativePct)}</td>
                <td className="px-2 text-right tabular-nums">{point.funds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
