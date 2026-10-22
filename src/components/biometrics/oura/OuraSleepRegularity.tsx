import { useState } from 'react';
import { Moon } from 'lucide-react';
import {
  CONSISTENCY_TOLERANCE_MIN, formatAxisClock, formatDuration, type SleepRegularity,
} from '../../../lib/biometrics/ouraSleepRegularity';
import { formatShortDateWarsaw } from '../../../lib/date';
import Skeleton from '../../ui/Skeleton';
import { clamp } from './ouraDayNightLayout';
import { OuraSleepRegularityPlot } from './OuraSleepRegularityPlot';
import { useElementWidth } from './useElementWidth';

const TOOLTIP_WIDTH = 176;

interface OuraSleepRegularityProps {
  data: SleepRegularity | undefined;
  loading: boolean;
  error?: string | null;
}

const nightDate = (date: string) => formatShortDateWarsaw(`${date}T12:00:00Z`);

function buildAriaLabel(d: SleepRegularity): string {
  return `Regularność snu z ostatnich ${d.nights.length} nocy: mediana zaśnięcia ${formatAxisClock(d.medianBedtimeAxis ?? 0)}, `
    + `odchylenie ${d.bedtimeStdMin} min, ${d.nightsWithinTolerance} z ${d.nights.length} nocy w ±${CONSISTENCY_TOLERANCE_MIN} min od mediany. `
    + 'Strzałkami wybierzesz noc.';
}

function Stats({ d }: { d: SleepRegularity }) {
  return (
    <>
      <dl className="oura-sr-stats">
        <div><dt>Mediana zaśnięcia</dt><dd>{formatAxisClock(d.medianBedtimeAxis ?? 0)}</dd></div>
        <div><dt>Odchylenie</dt><dd>±{d.bedtimeStdMin} min</dd></div>
      </dl>
      <p className="oura-sr-note">
        Spójność: {d.nightsWithinTolerance} z {d.nights.length} nocy ({d.consistencyPct}%) z zaśnięciem w ±{CONSISTENCY_TOLERANCE_MIN} min od mediany.
        Odchylenie pobudki ±{d.wakeStdMin} min.
      </p>
    </>
  );
}

function Chart({ d }: { d: SleepRegularity }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [pick, setPick] = useState<{ date: string | null; x: number }>({ date: null, x: 0 });
  const activeDate = pick.date;
  const active = d.nights.find((n) => n.date === activeDate) ?? null;
  const tipLeft = clamp(pick.x - TOOLTIP_WIDTH / 2, 0, Math.max(0, width - TOOLTIP_WIDTH));
  const line = active
    ? `${nightDate(active.date)}: zaśnięcie ${formatAxisClock(active.bedtimeAxis)}, pobudka ${formatAxisClock(active.wakeAxis)}, sen ${formatDuration(active.sleepMinutes)}`
    : '';
  return (
    <>
      <div ref={ref} className="oura-sr-plot min-w-0 overflow-hidden">
        <OuraSleepRegularityPlot
          data={d} width={width} activeDate={activeDate} onActiveChange={(date, x) => setPick((prev) => ({ date, x: x ?? prev.x }))} ariaLabel={buildAriaLabel(d)}
        />
        {active && (
          <div className="oura-sr-tooltip" style={{ left: tipLeft, width: TOOLTIP_WIDTH }} aria-hidden="true">
            <p className="oura-sr-tooltip-title">{active.weekday}, {nightDate(active.date)}</p>
            <dl>
              <div><dt>Zaśnięcie</dt><dd>{formatAxisClock(active.bedtimeAxis)}</dd></div>
              <div><dt>Pobudka</dt><dd>{formatAxisClock(active.wakeAxis)}</dd></div>
              <div><dt>Sen</dt><dd>{formatDuration(active.sleepMinutes)}</dd></div>
            </dl>
          </div>
        )}
      </div>
      <ul className="oura-sr-legend" aria-label="Legenda">
        <li><span className="oura-sr-swatch" data-within="true" />w ±{CONSISTENCY_TOLERANCE_MIN} min od mediany</li>
        <li><span className="oura-sr-swatch" data-within="false" />poza strefą</li>
      </ul>
      <p className="sr-only" aria-live="polite">{line}</p>
      <div className="sr-only">
        <table>
          <caption>Regularność snu w tabeli</caption>
          <thead><tr><th>Noc</th><th>Zaśnięcie</th><th>Pobudka</th><th>Sen</th></tr></thead>
          <tbody>
            {d.nights.map((n) => (
              <tr key={n.date}>
                <td>{n.weekday} {nightDate(n.date)}</td>
                <td>{formatAxisClock(n.bedtimeAxis)}</td><td>{formatAxisClock(n.wakeAxis)}</td>
                <td>{formatDuration(n.sleepMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Body({ data, loading, error }: OuraSleepRegularityProps) {
  if (loading) return <div aria-busy="true" aria-label="Ładowanie regularności snu"><Skeleton variant="card" lines={5} /></div>;
  if (error) return <div role="alert" className="oura-sr-state"><p>Nie udało się wczytać regularności snu.</p><p>{error}</p></div>;
  if (!data) return null;
  if (data.status === 'insufficient') {
    const have = data.nights.length;
    return (
      <div className="oura-sr-state">
        <Moon size={20} aria-hidden="true" />
        <p>Za mało danych: {have} z {data.needed} nocy z pomiarem.</p>
        <progress className="oura-sr-progress" value={have} max={data.needed} aria-label="Postęp zbierania nocy" />
        <p>Regularność policzymy z ostatnich 14 nocy, gdy będzie ich co najmniej {data.needed}.</p>
      </div>
    );
  }
  return <><Stats d={data} /><Chart d={data} /></>;
}

export function OuraSleepRegularity(props: OuraSleepRegularityProps) {
  return (
    <section className="oura-sr grid-cols-1" aria-labelledby="oura-sr-title">
      <header>
        <h3 id="oura-sr-title">Regularność snu</h3>
        <p>Pory zaśnięcia i pobudki z ostatnich 14 nocy (oś od 18:00)</p>
      </header>
      <Body {...props} />
    </section>
  );
}
