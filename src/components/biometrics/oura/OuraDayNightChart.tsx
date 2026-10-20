import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import type { DayNightTimeline } from '../../../lib/biometrics/ouraDayTimeline.types';
import { formatLongDateWarsaw } from '../../../lib/date';
import IconButton from '../../ui/IconButton';
import Skeleton from '../../ui/Skeleton';
import Tabs from '../../ui/Tabs';
import { resolveViewWindow, type ViewMode } from './ouraDayNightLayout';
import { OuraDayNightPlot } from './OuraDayNightPlot';
import {
  buildAltRows, describeMoment, formatMomentLine, STAGE_LABEL,
} from './ouraDayNightReadout';
import { useDayNightViewMode } from './useDayNightViewMode';
import { useElementWidth } from './useElementWidth';

export interface OuraDayNightChartProps {
  timeline: DayNightTimeline | null;
  loading: boolean;
  error?: string | null;
  onPrevNight: () => void;
  onNextNight?: () => void;
}

const STAGES = ['deep', 'light', 'rem', 'awake'] as const;
const VIEW_TABS = [
  { key: 'full', label: 'Dzień + noc' },
  { key: 'night', label: 'Tylko noc' },
];

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

function ChartBody({ timeline, mode, swapping }: { timeline: DayNightTimeline; mode: ViewMode; swapping: boolean }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [cursor, setCursor] = useState<number | null>(null);
  const view = resolveViewWindow(timeline.windowStart, timeline.windowEnd, timeline.sleepStart, timeline.sleepEnd, mode);
  const cursorMs = cursor !== null && cursor >= view.startMs && cursor <= view.endMs ? cursor : null;
  const live = cursorMs === null ? '' : formatMomentLine(describeMoment(timeline, cursorMs));
  const hasSleep = timeline.sleepStart !== null && timeline.sleepEnd !== null;
  return (
    <>
      {!hasSleep && <p className="oura-dn-note">Brak snu tej nocy — pokazuję sam dzień.</p>}
      <div ref={ref} className="oura-dn-scroll">
        <div key={view.mode} className={swapping ? 'oura-dn-swap' : undefined}>
          <OuraDayNightPlot timeline={timeline} view={view} width={width} cursorMs={cursorMs} onCursorChange={setCursor} />
        </div>
      </div>
      <ul className="oura-dn-legend" aria-label="Legenda">
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
  const [mode, setMode] = useDayNightViewMode();
  /** Night the user switched the view on; the fade only plays for that night, never on night navigation. */
  const [swapNight, setSwapNight] = useState<string | null>(null);
  const subtitle = timeline ? `Noc do ${formatLongDateWarsaw(`${timeline.nightDate}T12:00:00Z`)}` : 'Kofeina, posiłki, trening i noc na jednej osi';
  const canToggle = !loading && !error && timeline !== null && timeline.sleepStart !== null && timeline.sleepEnd !== null;
  const goPrev = () => { setSwapNight(null); onPrevNight(); };
  const goNext = onNextNight ? () => { setSwapNight(null); onNextNight(); } : undefined;
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
    body = <ChartBody key={timeline.nightDate} timeline={timeline} mode={mode} swapping={swapNight === timeline.nightDate} />;
  }

  return (
    <section className="oura-dn" aria-labelledby="oura-dn-title">
      <header className="oura-dn-head">
        <div>
          <h2 id="oura-dn-title">Dzień → noc</h2>
          <p>{subtitle}</p>
        </div>
        <div className="oura-dn-nav">
          <IconButton variant="tonal" size="sm" label="Poprzednia noc" icon={<ChevronLeft size={18} />} onClick={goPrev} />
          <IconButton variant="tonal" size="sm" label="Następna noc" icon={<ChevronRight size={18} />}
            onClick={goNext} disabled={!goNext} />
        </div>
      </header>
      {canToggle && timeline && (
        <div className="oura-dn-controls">
          <Tabs
            tabs={VIEW_TABS}
            active={mode}
            className="oura-dn-toggle"
            onChange={(key) => { setSwapNight(timeline.nightDate); setMode(key === 'night' ? 'night' : 'full'); }}
          />
        </div>
      )}
      {body}
    </section>
  );
}
