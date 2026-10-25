import type { VoiceReport } from '../../../lib/closer/closerVoiceTrends';
import { Card } from '../../ui/Card';
import CloserTrendDelta from './CloserTrendDelta';

const MIN_CALLS = 3;
const SMALL_SAMPLE = 10;

/** Prowadzenie rozmowy liczone z transkryptu (bez AI): kto ile mówi, jak długo bez przerwy, ile pyta klient. */
export default function CloserVoiceCard({ report }: { report: VoiceReport }) {
  if (report.calls < MIN_CALLS) return null;
  return <Card variant="grouped" padding="0" aria-label="Prowadzenie rozmowy" className="divide-y divide-border-custom">
    <div className="space-y-1 px-4 py-4">
      <h4 className="text-base font-semibold text-text-primary">Prowadzenie rozmowy</h4>
      <p className="text-sm text-text-secondary">
        Liczone z transkryptu, średnia z 5 ostatnich rozmów vs poprzednie 5 · {report.calls} rozmów sprzedażowych
        {report.calls < SMALL_SAMPLE ? ' · mała próba, traktuj jako wskazówkę' : ''}
      </p>
    </div>
    <ul className="divide-y divide-border-custom">
      {report.metrics.filter(metric => metric.recent !== null).map(metric => <li key={metric.key} className="space-y-1 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm font-medium text-text-primary">{metric.label}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-sm tabular-nums text-text-primary">{String(metric.recent).replace('.', ',')}{metric.unit ? ' ' + metric.unit : ''}</span>
            <CloserTrendDelta delta={metric.delta} better={metric.better} />
          </span>
        </div>
        {metric.hint && <p className="text-xs text-text-secondary">{metric.hint}</p>}
      </li>)}
    </ul>
  </Card>;
}
