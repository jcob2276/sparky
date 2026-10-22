import { DashboardData } from '../../lib/investments/dashboardService';
import { formatDashboardDate } from '../../lib/date';

const STATUS_LABELS: Record<string, string> = { ok: 'OK', partial: 'częściowo', error: 'błąd', failed: 'błąd' };
const MAX_ERROR_LENGTH = 110;

/** Błąd źródła bywa surowym JSON-em: pokazujemy czytelne streszczenie, szczegóły zostają w logach. */
function readableError(error: string | null | undefined): string | null {
  if (!error) return null;
  const trimmed = error.trim();
  if (trimmed.includes('{') || trimmed.includes('"error"')) return 'szczegóły techniczne w logach importu';
  return trimmed.length > MAX_ERROR_LENGTH ? `${trimmed.slice(0, MAX_ERROR_LENGTH)}…` : trimmed;
}

const stamp = (value: string | null | undefined, fallback: string) => (
  value ? new Date(value).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }) : fallback
);

export function DashboardSourceStatus({ data }: { data: DashboardData }) {
  const problems = data.sourceStatuses.filter((source) => source.status !== 'ok').length;

  return <div className="p-4 rounded-2xl bg-surface border border-border-custom text-xs space-y-2">
    <p>Odczyt bazy: {stamp(data.fetchedAt, 'brak')} · daty na wykresie oznaczają daty zgłoszeń, nie importu.</p>
    {data.issues.map(issue => <p key={issue} className="text-warning">{issue}</p>)}
    <details>
      <summary className={`cursor-pointer font-medium ${problems > 0 ? 'text-warning' : 'text-text-secondary'}`}>
        Stan źródeł danych: {problems > 0 ? `${problems} z ${data.sourceStatuses.length} wymaga uwagi` : 'wszystkie działają'}
      </summary>
      <ul className="mt-2 space-y-1.5">
        {data.sourceStatuses.map(source => {
          const error = readableError(source.error);
          return <li key={source.source} className={source.status === 'ok' ? 'text-text-secondary' : 'text-warning'}>
            <span className="font-semibold">{source.source}</span>: {STATUS_LABELS[source.status] ?? source.status}
            {' · '}kontrola {stamp(source.checked_at, 'brak danych')}
            {' · '}ostatni udany import {stamp(source.last_success_at, 'nieznany')}
            {' · '}najnowsze ujawnienie {source.latest_disclosure_date ?? 'nieznane'}{error ? ` · ${error}` : ''}
          </li>;
        })}
      </ul>
    </details>
    <p className="text-text-muted">Źródła bez rekordu monitora: czas ostatniej kontroli i importu nieznany. Odczyt bazy nie potwierdza aktualności źródła.</p>
  </div>;
}
export function DashboardHeader() {
  return <div className="font-mono text-xs font-bold text-text-muted">PULPIT {formatDashboardDate().toUpperCase()} · EUROPE/WARSAW</div>;
}
