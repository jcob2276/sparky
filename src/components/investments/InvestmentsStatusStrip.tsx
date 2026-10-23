import { FC } from 'react';
import { CalendarRange, Database } from 'lucide-react';
import { formatIsoDatePl } from '../../lib/investments/investmentsApi';
import { currentYear } from '../../lib/investments/yearFloor';

interface Props {
  /** Najświeższa data zdarzenia Form 4 (YYYY-MM-DD) albo null, gdy brak danych. */
  latestTradeIso: string | null;
  tradeCount: number;
  loading: boolean;
}

/** Stała etykieta retencji + świeżość głównego źródła. Bez nowych zapytań — liczy z już wczytanych danych. */
export const InvestmentsStatusStrip: FC<Props> = ({ latestTradeIso, tradeCount, loading }) => {
  const freshness = loading
    ? 'sprawdzam świeżość…'
    : latestTradeIso
      ? `ostatnie zdarzenie ${formatIsoDatePl(latestTradeIso)}`
      : 'brak zdarzeń w tym roku';

  return (
    <div
      className="mb-4 flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-surface-1 px-3.5 py-2 text-2xs text-text-secondary"
      role="status"
      aria-label="Zakres i świeżość danych"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
        <CalendarRange size={12} aria-hidden="true" className="text-text-muted" />
        Dane od 1 stycznia {currentYear()}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Database size={12} aria-hidden="true" className="text-text-muted" />
        <span className="ui-num">Form 4 (SEC): {freshness}</span>
        {!loading && tradeCount > 0 && <span className="ui-num text-text-muted">· {tradeCount} zgłoszeń</span>}
      </span>
      <span className="text-text-muted">Źródła: SEC 13F · STOCK Act · KNF · ESPI</span>
    </div>
  );
};
