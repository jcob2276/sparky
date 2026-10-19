import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import type { DayNightTimeline } from '../../../lib/biometrics/ouraDayTimeline.types';
import { formatLongDateWarsaw } from '../../../lib/date';
import IconButton from '../../ui/IconButton';
import Skeleton from '../../ui/Skeleton';
import { OuraDayNightPlot } from './OuraDayNightPlot';
import { buildAltRows, caffeineGap, describeMoment, formatClock, formatMomentLine, STAGE_LABEL } from './ouraDayNightReadout';
import { useElementWidth } from './useElementWidth';

export interface OuraDayNightChartProps {
  timeline: DayNightTimeline | null;
  loading: boolean;
  error?: string | null;
  onPrevNight: () => void;
  onNextNight?: () => void;
}

const STAGES = ['deep', 'light', 'rem', 'awake'] as const;

function SummaryStats({ timeline }: { timeline: DayNightTimeline }) {
  const { summary } = timeline;
  const gap = caffeineGap(timeline);
  const items: Array<[string, string]> = [
    ['Kofeina łącznie', summary.totalCaffeineMg > 0 ? `${Math.round(summary.totalCaffeineMg)} mg` : 'brak'],
    ['Ostatnia kofeina', summary.lastCaffeineAt ? formatClock(Date.parse(summary.lastCaffeineAt)) : 'brak'],
    ['Przerwa do snu', gap ? gap.label : '—'],
    ['W ciele przy śnie', summary.caffeineAtBedtimeMg === null ? '—' : `~${Math.round(summary.caffeineAtBedtimeMg)} mg`],
  ];
  return (
    <dl className="oura-dn-stats">
      {items.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

function AltTable({ timeline }: { timeline: DayNightTimeline }) {
  const rows = useMemo(() => buildAltRows(timeline), [timeline]);
  return (
    <table className="sr-only">
      <caption>Dzień i noc w tabeli: godzina, zdarzenia i pomiary</caption>
      <thead><tr><th scope="col">Godzina</th><th scope="col">Opis</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.key}><th scope="row">{row.time}</th><td>{row.summary}</td></tr>)}
      </tbody>
    </table>
  );
}

function ChartBody({ timeline }: { timeline: DayNightTimeline }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [cursorMs, setCursorMs] = useState<number | null>(null);
  const live = cursorMs === null ? '' : formatMomentLine(describeMoment(timeline, cursorMs));
  return (
    <>
      <SummaryStats timeline={timeline} />
      <div ref={ref} className="oura-dn-scroll">
        <OuraDayNightPlot timeline={timeline} width={width} cursorMs={cursorMs} onCursorChange={setCursorMs} />
      </div>
      <ul className="oura-dn-legend" aria-label="Legenda faz snu">
        {STAGES.map((stage) => (
          <li key={stage}><span className="oura-dn-swatch" data-stage={stage} />{STAGE_LABEL[stage]}</li>
        ))}
        <li><span className="oura-dn-swatch" data-series="hr" />tętno</li>
        <li><span className="oura-dn-swatch" data-series="hrv" />HRV</li>
      </ul>
      <p className="sr-only" aria-live="polite">{live}</p>
      <AltTable timeline={timeline} />
    </>
  );
}

export function OuraDayNightChart({ timeline, loading, error, onPrevNight, onNextNight }: OuraDayNightChartProps) {
  const subtitle = timeline ? `Noc do ${formatLongDateWarsaw(`${timeline.nightDate}T12:00:00Z`)}` : 'Kofeina, suple, posiłki i noc na jednej osi';
  let body;
  if (loading) {
    body = <div aria-busy="true" aria-label="Ładowanie wykresu"><Skeleton variant="card" lines={6} /></div>;
  } else if (error) {
    body = (
      <div role="alert" className="oura-dn-state">
        <AlertTriangle size={20} aria-hidden="true" />
        <p>Nie udało się wczytać nocy.</p>
        <p className="oura-dn-state-detail">{error}</p>
      </div>
    );
  } else if (!timeline) {
    body = (
      <div className="oura-dn-state">
        <Moon size={20} aria-hidden="true" />
        <p>Brak danych z tej nocy.</p>
        <p className="oura-dn-state-detail">Spróbuj poprzedniej nocy.</p>
      </div>
    );
  } else {
    body = <ChartBody key={timeline.nightDate} timeline={timeline} />;
  }

  return (
    <section className="oura-dn" aria-labelledby="oura-dn-title">
      <header className="oura-dn-head">
        <div>
          <h3 id="oura-dn-title">Dzień → noc</h3>
          <p>{subtitle}</p>
        </div>
        <div className="oura-dn-nav">
          <IconButton variant="tonal" size="sm" label="Poprzednia noc" icon={<ChevronLeft size={18} />} onClick={onPrevNight} />
          <IconButton variant="tonal" size="sm" label="Następna noc" icon={<ChevronRight size={18} />}
            onClick={onNextNight} disabled={!onNextNight} />
        </div>
      </header>
      {body}
    </section>
  );
}
