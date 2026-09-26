import { FC, useEffect, useState } from 'react';
import { fetchQuote, QuotePoint } from '../../lib/investments/publicMarket';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';

interface QuoteMark {
  date: string;
  up: boolean;
}

interface Props {
  ticker: string;
  marks: QuoteMark[];
}

function pathFor(points: QuotePoint[]): string {
  const closes = points.map((point) => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  return points
    .map((point, index) => {
      const x = 8 + (index / Math.max(points.length - 1, 1)) * 624;
      const y = 12 + (1 - (point.close - min) / span) * 150;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const QuoteChart: FC<Props> = ({ ticker, marks }) => {
  const [points, setPoints] = useState<QuotePoint[] | null>(null);

  useEffect(() => {
    let active = true;
    const from = shiftDateStr(getTodayWarsaw(), -420);
    fetchQuote(ticker, from)
      .then((next) => {
        if (active) setPoints(next);
      })
      .catch(() => {
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, [ticker]);

  if (!points) return <p className="text-xs font-mono text-text-muted">Notowania {ticker}…</p>;
  if (points.length < 2) {
    return <p className="text-xs text-text-secondary">Brak serii notowań dla {ticker}.</p>;
  }

  const closes = points.map((point) => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const dots = marks.flatMap((mark) => {
    const index = points.findIndex((point) => point.date >= mark.date);
    if (index < 0) return [];
    const point = points[index];
    if (!point) return [];
    return [{
      x: 8 + (index / Math.max(points.length - 1, 1)) * 624,
      y: 12 + (1 - (point.close - min) / span) * 150,
      up: mark.up,
    }];
  });

  return (
    <div className="mt-3">
      <div className="text-3xs font-mono uppercase tracking-wide text-text-muted mb-1">
        {ticker} · close_adj · znaczniki transakcji
      </div>
      <svg viewBox="0 0 640 180" className="w-full h-36 bg-surface border border-border-custom rounded-lg">
        <path d={pathFor(points)} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary" />
        {dots.map((dot, index) => (
          <circle key={index} cx={dot.x} cy={dot.y} r="3.5" className={dot.up ? 'fill-success' : 'fill-danger'} />
        ))}
      </svg>
    </div>
  );
};
