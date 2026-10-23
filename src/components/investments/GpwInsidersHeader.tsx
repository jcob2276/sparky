import { FC } from 'react';
import type { GpwInsiderKpis } from '../../lib/investments/gpwInsidersService';
import Button from '../ui/Button';
import { formatDotDate } from './gpwInsidersFormat';

interface Props {
  kpis: GpwInsiderKpis | null;
  floor: string;
  onNavigateTab?: (tab: string) => void;
}

const Card: FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs">
    <div className="text-2xs font-mono text-text-muted">{label}</div>
    <div className="text-2xl sm:text-3xl font-semibold font-mono text-text-primary mt-1">{value}</div>
    <div className="text-2xs font-mono text-text-muted mt-0.5">{note}</div>
  </div>
);

export const GpwInsidersHeader: FC<Props> = ({ kpis, floor, onNavigateTab }) => {
  const since = formatDotDate(floor);
  const until = kpis?.latestReportDate ? formatDotDate(kpis.latestReportDate) : '—';
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">Insiderzy GPW (MAR art. 19)</h1>
        <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
          Zawiadomienia o transakcjach osób pełniących obowiązki zarządcze. Dane od 1 stycznia {floor.slice(0, 4)} ·
          źródło: ESPI/GPW, import do bazy · dane do {until}. Widok źródłowy nie zawiera kwot ani nazwisk, dlatego ich nie pokazujemy.
        </p>
      </div>

      <nav aria-label="Rynek polski" className="flex items-center gap-1 border-b border-border-custom/50">
        <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.('gpw_shorts')}>Krótka sprzedaż</Button>
        <Button variant="tonal" size="sm" aria-current="page">Insiderzy (MAR)</Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.('methodology')}>Fundamenty</Button>
      </nav>

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <Card
            label="Nabycia / zbycia"
            value={`${kpis.purchases} / ${kpis.sales}`}
            note={`od ${since} · ${kpis.total} zawiadomień łącznie`}
          />
          <Card
            label="Najaktywniejsza spółka"
            value={kpis.mostActiveTicker ? `${kpis.mostActiveTicker} · ${kpis.mostActiveCount}` : '—'}
            note={`mediana na spółkę: ${kpis.medianPerCompany}`}
          />
          <Card
            label="Tempo zgłoszeń"
            value={`${kpis.tempo30d} / 30 dni`}
            note={`średnio ${kpis.tempoAvgMonthly} / miesiąc od ${since}`}
          />
        </div>
      )}
    </div>
  );
};
