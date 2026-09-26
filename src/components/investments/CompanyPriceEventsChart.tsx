import { FC, useState, useMemo } from 'react';
import Button from '../ui/Button';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

interface Props {
  data: CompanyDetailData;
}

type Timeframe = '3M' | '12M';

interface ChartPoint {
  x: number;
  y: number;
  date: string;
  close: number;
}

interface EventMarker {
  x: number;
  y: number;
  date: string;
  hasPolitician: boolean;
  hasInsider: boolean;
}

function computeChartGeometry(
  prices: Array<{ date: string; close: number }>,
  eventsByDate: Map<string, { politicians: CompanyDetailData['politicians']['trades']; insiders: CompanyDetailData['insiders']['trades'] }>
) {
  if (prices.length === 0) {
    return { minPrice: 0, maxPrice: 100, points: [], pathD: '', areaD: '', eventMarkers: [] };
  }
  const closes = prices.map((p) => p.close);
  const rawMin = Math.min(...closes);
  const rawMax = Math.max(...closes);
  const padding = (rawMax - rawMin) * 0.08 || 5;
  const minPrice = Math.max(0, rawMin - padding);
  const maxPrice = rawMax + padding;
  const range = maxPrice - minPrice || 1;

  const width = 800;
  const height = 240;
  const padX = 10;
  const padY = 20;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points: ChartPoint[] = prices.map((p, i) => {
    const x = padX + (i / (prices.length - 1 || 1)) * usableW;
    const y = padY + (1 - (p.close - minPrice) / range) * usableH;
    return { x, y, date: p.date, close: p.close };
  });

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const eventMarkers: EventMarker[] = [];
  points.forEach((pt) => {
    const ev = eventsByDate.get(pt.date);
    if (ev && (ev.politicians.length > 0 || ev.insiders.length > 0)) {
      eventMarkers.push({
        x: pt.x,
        y: pt.y,
        date: pt.date,
        hasPolitician: ev.politicians.length > 0,
        hasInsider: ev.insiders.length > 0,
      });
    }
  });

  return { minPrice, maxPrice, points, pathD, areaD, eventMarkers };
}

const PriceChartTooltip: FC<{
  point: ChartPoint;
  events?: { politicians: CompanyDetailData['politicians']['trades']; insiders: CompanyDetailData['insiders']['trades'] };
}> = ({ point, events }) => {
  return (
    <div
      className="pointer-events-none absolute top-2 bg-surface-subtle border border-border-custom rounded-xl p-2.5 shadow-lg text-2xs space-y-1"
      style={{ left: `${Math.min(75, Math.max(5, (point.x / 800) * 100))}%` }}
    >
      <div className="font-mono text-text-muted flex justify-between gap-4">
        <span>{point.date}</span>
        <span className="font-bold text-text-primary font-mono">{point.close.toFixed(2)} USD</span>
      </div>
      {events && (events.politicians.length > 0 || events.insiders.length > 0) && (
        <div className="pt-1 border-t border-border-custom/50 space-y-1">
          {events.politicians.map((p, i) => (
            <div key={i} className="text-3xs text-success font-semibold flex items-center gap-1">
              <span>●</span>
              <span>Polityk: {p.filerName} ({p.type} {p.amountLabel})</span>
            </div>
          ))}
          {events.insiders.map((ins, i) => (
            <div key={i} className="text-3xs text-accent font-semibold flex items-center gap-1">
              <span>●</span>
              <span>Insider: transakcja ({ins.transactionCode})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CompanyPriceEventsChart: FC<Props> = ({ data }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('12M');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const filteredPrices = useMemo(() => {
    if (!data.prices || data.prices.length === 0) return [];
    const days = timeframe === '3M' ? -90 : -365;
    const cutoffStr = shiftDateStr(getTodayWarsaw(), days);
    const slice = data.prices.filter((p) => p.date >= cutoffStr);
    return slice.length > 5 ? slice : data.prices.slice(timeframe === '3M' ? -65 : -260);
  }, [data.prices, timeframe]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { politicians: typeof data.politicians.trades; insiders: typeof data.insiders.trades }>();
    data.politicians.trades.forEach((t) => {
      const d = t.transactionDate || t.disclosureDate;
      if (!map.has(d)) map.set(d, { politicians: [], insiders: [] });
      map.get(d)!.politicians.push(t);
    });
    data.insiders.trades.forEach((t) => {
      const d = t.transactionDate || t.filingDate;
      if (!map.has(d)) map.set(d, { politicians: [], insiders: [] });
      map.get(d)!.insiders.push(t);
    });
    return map;
  }, [data]);

  const { minPrice, maxPrice, points, pathD, areaD, eventMarkers } = useMemo(
    () => computeChartGeometry(filteredPrices, eventsByDate),
    [filteredPrices, eventsByDate]
  );

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
            Kurs + Zdarzenia Ujawnien
          </h3>
          <p className="text-2xs text-text-muted mt-0.5">
            Kropki pokazuja transakcje politykow i insiderow na osi czasu kursu
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-3xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>Polityk</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>Insider</span>
            </span>
          </div>

          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50">
            <Button
              size="sm"
              variant={timeframe === '3M' ? 'secondary' : 'ghost'}
              onClick={() => setTimeframe('3M')}
              className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
            >
              3M
            </Button>
            <Button
              size="sm"
              variant={timeframe === '12M' ? 'secondary' : 'ghost'}
              onClick={() => setTimeframe('12M')}
              className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
            >
              12M
            </Button>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        {points.length > 0 ? (
          <svg
            viewBox="0 0 800 240"
            className="w-full h-56 sm:h-64 overflow-visible"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = (e.clientX - rect.left) / rect.width;
              const idx = Math.min(points.length - 1, Math.max(0, Math.round(relX * (points.length - 1))));
              setHoverIndex(idx);
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="companyPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success-green)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-success-green)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0.2, 0.5, 0.8].map((ratio) => {
              const y = 20 + ratio * 200;
              const priceVal = maxPrice - ratio * (maxPrice - minPrice);
              return (
                <g key={ratio}>
                  <line x1="0" y1={y} x2="800" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-border-custom/40" />
                  <text x="795" y={y - 4} textAnchor="end" className="text-3xs font-mono fill-text-muted">
                    {priceVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            <path d={areaD} fill="url(#companyPriceGrad)" />
            <path d={pathD} fill="none" stroke="var(--color-success-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {eventMarkers.map((m, idx) => (
              <g key={idx} transform={`translate(${m.x}, ${m.y})`}>
                {m.hasPolitician && <circle r="4.5" className="fill-success stroke-surface" strokeWidth="1.5" />}
                {m.hasInsider && <circle r="4" cx={m.hasPolitician ? 6 : 0} className="fill-accent stroke-surface" strokeWidth="1.5" />}
              </g>
            ))}

            {activePoint && (
              <g>
                <line x1={activePoint.x} y1="10" x2={activePoint.x} y2="230" stroke="currentColor" strokeDasharray="2 2" className="text-text-muted" />
                <circle cx={activePoint.x} cy={activePoint.y} r="5" className="fill-success stroke-text-primary" strokeWidth="2" />
              </g>
            )}
          </svg>
        ) : (
          <div className="h-56 flex items-center justify-center text-xs text-text-muted">
            Brak notowan historycznych dla {data.ticker}
          </div>
        )}

        {activePoint && <PriceChartTooltip point={activePoint} events={eventsByDate.get(activePoint.date)} />}
      </div>

      {points.length > 0 && (
        <div className="flex justify-between text-3xs font-mono text-text-muted px-2 pt-1 border-t border-border-custom/30">
          <span>{points[0].date}</span>
          <span>{points[Math.floor(points.length / 2)].date}</span>
          <span>{points[points.length - 1].date}</span>
        </div>
      )}
    </div>
  );
};
