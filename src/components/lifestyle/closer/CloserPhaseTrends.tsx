import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { PhaseReport, PhaseTrend } from '../../../lib/closer/closerPhaseTrends';
import { Card } from '../../ui/Card';

const MIN_CALLS = 3;
const SMALL_SAMPLE = 10;

function Delta({ trend }: { trend: PhaseTrend }) {
  if (trend.delta === null) return <span className="text-xs text-text-secondary">brak porównania</span>;
  if (trend.delta === 0) return <span className="flex items-center gap-1 text-xs text-text-secondary"><Minus size={14} />bez zmian</span>;
  const up = trend.delta > 0;
  return <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-success' : 'text-danger'}`}>
    {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{up ? '+' : ''}{trend.delta.toString().replace('.', ',')}
  </span>;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) =>
  <div className="space-y-2 px-4 py-4"><h5 className="text-sm font-semibold text-text-primary">{title}</h5>{children}</div>;

/** Trend ocen etapów rozmów sprzedażowych: gdzie idziesz w górę, co poprawić, co się powtarza i co działa. */
export default function CloserPhaseTrends({ report }: { report: PhaseReport }) {
  if (report.salesCalls < MIN_CALLS) return null;
  const { fix, repeating, working } = report;
  return <Card variant="grouped" padding="0" aria-label="Trend etapów rozmów" className="divide-y divide-border-custom">
    <div className="space-y-1 px-4 py-4">
      <h4 className="text-base font-semibold text-text-primary">Etapy rozmów</h4>
      <p className="text-sm text-text-secondary">
        Ocena AI 1–5 względem kryteriów, średnia z 5 ostatnich rozmów vs poprzednie 5 · {report.salesCalls} rozmów sprzedażowych
        {report.salesCalls < SMALL_SAMPLE ? ' · mała próba, traktuj jako wskazówkę' : ''}
      </p>
    </div>
    <ul className="divide-y divide-border-custom">
      {report.trends.filter(t => t.calls > 0).map(trend => <li key={trend.phase} className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0 text-sm font-medium text-text-primary">{trend.label}<span className="ml-2 text-xs font-normal text-text-secondary">{trend.calls} ocen</span></span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-text-primary">{trend.recent === null ? '—' : trend.recent.toString().replace('.', ',') + '/5'}</span>
          <Delta trend={trend} />
        </span>
      </li>)}
    </ul>
    {fix && <Section title="Do poprawy w pierwszej kolejności">
      <p className="text-sm leading-6 text-text-secondary">
        <span className="font-medium text-text-primary">{fix.trend.label}</span> to Twój najniżej oceniany etap.
        {fix.missed ? ` Najczęściej brakuje: ${fix.missed.label.toLowerCase()} (${fix.missed.calls} rozm.).` : ''}
      </p>
    </Section>}
    {repeating.length > 0 && <Section title="Powtarza się">
      <ul className="space-y-1 text-sm leading-6 text-text-secondary">
        {repeating.map(stat => <li key={stat.id}>{stat.phaseLabel}: {stat.label.toLowerCase()} <span className="text-xs">· brak w {stat.calls} rozm.</span></li>)}
      </ul>
    </Section>}
    {working.length > 0 && <Section title="Działa — zostaw">
      <ul className="space-y-1 text-sm leading-6 text-text-secondary">
        {working.map(stat => <li key={stat.id}>{stat.phaseLabel}: {stat.label.toLowerCase()}</li>)}
      </ul>
    </Section>}
  </Card>;
}
