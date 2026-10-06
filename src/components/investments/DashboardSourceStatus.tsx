import { DashboardData } from '../../lib/investments/dashboardService';
import { formatDashboardDate } from '../../lib/date';
export function DashboardSourceStatus({ data }: { data: DashboardData }) {
  return <div className="p-4 rounded-2xl bg-surface border border-border-custom text-xs space-y-2">
    <p>Odczyt bazy: {new Date(data.fetchedAt).toLocaleString('pl-PL')} · daty na wykresie oznaczają daty zgłoszeń, nie importu.</p>
    {data.issues.map(issue => <p key={issue} className="text-warning">{issue}</p>)}
    {data.sourceStatuses.map(source => <p key={source.source} className={source.status === 'ok' ? 'text-text-secondary' : 'text-warning'}>
      {source.source}: {source.status} · kontrola {source.checked_at ? new Date(source.checked_at).toLocaleString('pl-PL') : 'brak danych'}
      {' · '}ostatni udany import {source.last_success_at ? new Date(source.last_success_at).toLocaleString('pl-PL') : 'nieznany'}
      {' · '}najnowsze ujawnienie {source.latest_disclosure_date ?? 'nieznane'}{source.error ? ` · ${source.error}` : ''}
    </p>)}
    <p className="text-text-muted">Źródła bez rekordu monitora: czas ostatniej kontroli i importu nieznany. Odczyt bazy nie potwierdza aktualności źródła.</p>
  </div>;
}
export function DashboardHeader() {
  return <div className="font-mono text-xs font-bold text-text-muted">PULPIT {formatDashboardDate().toUpperCase()} · EUROPE/WARSAW</div>;
}
