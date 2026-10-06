import { FC } from 'react';
import { GpwShortChartData } from '../../lib/investments/gpwShortsService';
import { formatLongDateWarsaw } from '../../lib/date';

interface Props { data: GpwShortChartData; isTopRanked?: boolean }

export const GpwShortsChartWidget: FC<Props> = ({ data, isTopRanked = false }) => {
  const points = data.points;
  const first = points[0]?.date;
  const last = points.at(-1)?.date;
  const start = first ? Date.parse(first) : 0;
  const span = last ? Math.max(86400000, Date.parse(last) - start) : 1;
  const x = (date: string) => 10 + ((Date.parse(date) - start) / span) * 270;
  const lines = (field: 'shortPct' | 'price', top: number, height: number, step: boolean) => {
    const known = points.map(p => p[field]).filter((v): v is number => v != null);
    if (!known.length) return [];
    const min = Math.min(...known);
    const range = Math.max(...known) - min || 1;
    const result: string[] = [];
    let path = '';
    let previousY: number | null = null;
    for (const point of points) {
      const value = point[field];
      if (value == null) { if (path) result.push(path); path = ''; previousY = null; continue; }
      const px = x(point.date);
      const py = top + height - ((value - min) / range) * height;
      path += path ? (step ? ` L${px},${previousY} L${px},${py}` : ` L${px},${py}`) : `M${px},${py}`;
      previousY = py;
    }
    if (path) result.push(path);
    return result;
  };
  const shortPaths = lines('shortPct', 10, 30, true);
  const pricePaths = lines('price', 60, 35, false);
  return <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-xs font-bold font-mono">{data.ticker}: publiczny short i kurs</h4>
      {isTopRanked && <span className="text-3xs text-text-muted">Największa ujawniona suma</span>}
    </div>
    {!points.length ? <p className="text-xs text-text-secondary">Brak historii wykresu dla tej spółki.</p> :
      <svg viewBox="0 0 320 120" className="w-full h-36" role="img" aria-label={`Historia ujawnionych pozycji i kursu ${data.ticker}`}>
        {shortPaths.map((d, i) => <path key={`short-${i}`} d={d} fill="none" stroke="var(--color-danger)" strokeWidth="1.8" />)}
        {points.filter(p => p.shortPct != null).length === 1 && points.filter(p => p.shortPct != null).map(p =>
          <circle key={p.date} cx={x(p.date)} cy="40" r="2.5" fill="var(--color-danger)" />)}
        {pricePaths.map((d, i) => <path key={`price-${i}`} d={d} fill="none" stroke="var(--color-text-muted)" strokeWidth="1.4" />)}
        <text x="315" y="18" textAnchor="end" className="text-3xs fill-danger">{data.shortPct == null ? '—' : `${data.shortPct.toFixed(2)}%`}</text>
        <text x="315" y="68" textAnchor="end" className="text-3xs fill-text-muted">{data.latestPrice?.toFixed(2) ?? '—'}</text>
        <text x="10" y="116" className="text-4xs fill-text-muted">{data.startDateLabel}</text>
        <text x="280" y="116" textAnchor="end" className="text-4xs fill-text-muted">{data.endDateLabel}</text>
      </svg>}
    <div className="text-2xs text-text-secondary space-y-1">
      <p>Ostatni zapisany stan rejestru: {data.shortPct == null ? 'brak danych' : `${data.shortPct.toFixed(2)}%`}
        {data.shortDate && ` (${formatLongDateWarsaw(data.shortDate)})`}</p>
      <p>Notowanie dzienne: {data.latestPrice == null ? 'brak danych' : `${data.latestPrice.toFixed(2)} zł`}
        {data.priceDate && ` (${formatLongDateWarsaw(data.priceDate)})`}</p>
      <p>Czerwona linia: suma z zapisanych stanów bieżącego rejestru. Szara: dostępne surowe kursy PLN. Skale są niezależne.</p>
      <p>Notowanie dla trwającej sesji może się jeszcze zmieniać.</p>
      {data.priceSourceUrl && <a href={data.priceSourceUrl} target="_blank" rel="noreferrer" className="text-primary underline">Źródło notowania</a>}
      <p>Zakres: dostępne obserwacje z ostatnich 90 dni. Archiwum pojedynczych zgłoszeń nie dowodzi historycznej sumy pozycji.</p>
    </div>
    {data.reportedPositions.length > 0 && <div className="border-t border-border-custom pt-3 space-y-2 text-2xs">
      <h5 className="font-bold">Ostatnie zgłoszenia pojedynczych pozycji</h5>
      {data.reportedPositions.map((report, i) => <a key={`${report.holder}-${report.date}-${i}`} href={report.sourceUrl}
        target="_blank" rel="noreferrer" className="block text-text-secondary hover:text-primary">
        {report.holder}: {report.pct.toFixed(2)}% · {formatLongDateWarsaw(report.date)}
      </a>)}
    </div>}
  </div>;
};
