import { FC, useState } from 'react';
import { useDisclosureBasket } from '../../lib/investments/useDisclosureBasket';
import type { BasketPoint } from '../../lib/investments/basketSimulation';
import Button from '../ui/Button';

function formatPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`;
}
function curve(points: BasketPoint[]): string {
  const values = points.map(point => point.returnPct);
  const min = Math.min(...values, 0), max = Math.max(...values, 0), span = max - min || 1;
  const from = Date.parse(points[0].date), duration = Date.parse(points.at(-1)!.date) - from || 1;
  return points.map((point, index) => {
    const x = 8 + (Date.parse(point.date) - from) / duration * 624;
    const y = 12 + (1 - (point.returnPct - min) / span) * 140;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
export const BasketSimulationView: FC = () => {
  const [size, setSize] = useState<5 | 10 | 20>(10);
  const query = useDisclosureBasket(size);
  const data = query.data;
  const last = data?.points.at(-1), baseline = data?.points[0];
  const positions = new Map(data?.positions.map(p => [p.ticker, p]));
  return (
    <div className="space-y-4 text-text-primary">
      <div className="rounded-2xl border border-border-custom bg-surface p-5 space-y-3">
        <h2 className="text-lg font-bold">Symulacja koszyka 13F</h2>
        <p className="text-xs text-text-secondary">
          Spółki z największą przewagą liczby funduszy raportujących wzrost liczby akcji nad spadkiem.
          Remisy rozstrzyga wartość pozycji, następnie ticker. Ranking pochodzi z części odczytanych raportów SEC.
          Koszyk zachowuje także pozycje obecnie zawieszone lub wycofane z obrotu.
        </p>
        <div className="flex gap-2">
          {([5, 10, 20] as const).map(n => <Button key={n} size="sm" variant={n === size ? 'primary' : 'secondary'}
            onClick={() => setSize(n)}>{n} pozycji</Button>)}
          <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>Odśwież</Button>
        </div>
        {query.isPending && <p className="text-xs text-text-muted">Pobieranie raportów i cen całego koszyka…</p>}
        {query.error && <p role="alert" className="text-xs text-danger">Nie udało się obliczyć koszyka: {query.error.message}</p>}
        {data && !query.error && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>Wynik: {last ? formatPct(last.returnPct) : '—'}</div>
            <div>Od: {baseline?.date ?? '—'}</div>
            <div>Do: {last?.date ?? '—'}</div>
            <div>Skład: {data.candidates.length} / {data.requestedSize}</div>
          </div>
          <p className="text-xs text-text-muted">
            Stan raportów: {data.period ?? '—'}; porównanie: {data.previousPeriod ?? '—'}.
            {' '}Wszystkie wykorzystane ujawnienia były opublikowane do {data.knownOn ?? '—'}.
          </p>
          {data.reason && <p role="status" className="text-xs text-text-secondary">{data.reason}
            {data.missingTickers.length > 0 && ` Brak danych: ${data.missingTickers.join(', ')}.`}
          </p>}
        </>}
      </div>
      {data && !query.error && <>
        {data.points.length > 1 && <div className="rounded-2xl border border-border-custom bg-surface p-4">
          <svg viewBox="0 0 640 170" role="img" aria-label="Hipotetyczna zmiana wartości koszyka w USD" className="w-full h-40">
            <path d={curve(data.points)} fill="none" className="stroke-primary" strokeWidth="1.8" />
          </svg>
          <p className="text-xs text-text-muted">{baseline?.date} → {last?.date} · {data.points.length} wspólnych dni wyceny</p>
        </div>}
        <div className="rounded-2xl border border-border-custom bg-surface p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold mb-3">Skład i ceny użyte w obliczeniu</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-text-muted text-left">
              <th className="p-2">Spółka</th><th className="p-2">Przewaga</th><th className="p-2">Waga początkowa</th>
              <th className="p-2">Cena od / do (USD, skorygowana)</th><th className="p-2">Zmiana</th>
            </tr></thead>
            <tbody>{data.candidates.map(c => {
              const position = positions.get(c.ticker);
              const status = data.listingStatuses[c.ticker];
              return <tr key={c.ticker} className="border-t border-border-custom">
                <td className="p-2"><strong>{c.ticker}</strong> · {c.company_name}
                  {(status === 'halted' || status === 'delisted') && <span className="block text-text-muted">
                    {status === 'halted' ? 'Obecnie zawieszone notowania' : 'Obecnie wycofane z obrotu'}
                  </span>}
                </td>
                <td className="p-2">{c.net_changes}</td>
                <td className="p-2">{(100 / data.candidates.length).toFixed(1).replace('.', ',')}%</td>
                <td className="p-2">{position ? <>
                  <a href={position.baselineSourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
                    {position.baselinePrice.toFixed(2)}
                  </a> / <a href={position.latestSourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
                    {position.latestPrice.toFixed(2)}
                  </a>
                </> : 'Brak wspólnej wyceny'}</td>
                <td className="p-2">{position ? formatPct(position.returnPct) : '—'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-border-custom bg-surface p-4 text-xs text-text-secondary space-y-3">
          <p>Równe kwoty na początku, stała liczba jednostek bez rebalansowania. Wycena zaczyna się w pierwszym wspólnym
            dniu zamknięcia sesji po ostatnim wykorzystanym ujawnieniu. Używamy cen skorygowanych dostawcy
            (<code>close_adj</code>), wyłącznie w USD, bez prowizji, spreadu, podatków i zmian USD/PLN.
            Brak ceny jednej spółki nie powoduje zastąpienia jej inną; pokazujemy tylko wspólne daty całego koszyka.</p>
          <p>Bieżący dzień jest pomijany, żeby notowania w trakcie sesji nie udawały jej końcowego zamknięcia.</p>
          <p>To rekonstrukcja koszyka z obecnego odczytu raportów, a nie pełny backtest strategii ani wynik funduszu.
            Pokrycie i historyczne ceny mogą zmieniać się wraz z importem danych. Wynik kończy się na podanej dacie,
            także gdy notowania jednej ze spółek zostały zawieszone.</p>
          <details><summary className="cursor-pointer">Raporty SEC użyte przy wyborze ({data.reportSources.length})</summary>
            <div className="grid gap-2 mt-3 sm:grid-cols-3">{data.reportSources.map((report, index) =>
              <a key={report.filing_url} href={report.filing_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                SEC {index + 1} · stan {report.period_of_report} · ujawniono {report.filing_date}
              </a>)}</div>
          </details>
        </div>
      </>}
    </div>
  );
};
