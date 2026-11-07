import { Monitor, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ActiveSession } from '../../lib/authSessionsApi';
import { formatLongDateWarsaw, warsawTimeOfDay } from '../../lib/date';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import SettingsSection from './SettingsSection';
import { sessionDeviceLabel } from './sessionDeviceLabel';

interface ActiveSessionsViewProps {
  sessions?: ActiveSession[];
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRefresh: () => void;
}

function SessionTime({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return <time dateTime={value}>{formatLongDateWarsaw(value)} · {warsawTimeOfDay(value)}</time>;
}

export default function ActiveSessionsView({ sessions, loading, refreshing, error, onRefresh }: ActiveSessionsViewProps) {
  return (
    <SettingsSection icon={<ShieldCheck size={16} />} title="Aktywne sesje"
      description="Sprawdź, gdzie jesteś zalogowany do Sparky.">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary" aria-live="polite">
          Zalogowane sesje: <span className="font-semibold tabular-nums text-text-primary">{loading || error ? '—' : sessions?.length ?? '—'}</span>
        </p>
        <Button variant="ghost" size="sm" loading={refreshing} onClick={onRefresh}
          icon={<RefreshCw size={14} />} aria-label="Odśwież aktywne sesje">Odśwież</Button>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">Nie udało się pobrać aktywnych sesji. Spróbuj ponownie.</p>
        : loading ? <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size="sm" />Pobieram sesje…</div>
          : sessions?.length === 0 ? <p className="text-sm text-text-muted">Brak aktywnych sesji.</p>
            : <ul aria-label="Zalogowane sesje" className="max-h-96 divide-y divide-border-custom overflow-y-auto">
              {sessions?.map(session => (
                <li key={session.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <Monitor size={18} className="mt-1 shrink-0 text-text-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{sessionDeviceLabel(session.user_agent)}</p>
                      {session.is_current && <Badge variant="tag">Ta sesja</Badge>}
                    </div>
                    <p className="break-all text-xs text-text-secondary">IP: {session.ip || 'Brak danych'}</p>
                    <p className="text-xs text-text-muted">Logowanie: <SessionTime value={session.created_at} /></p>
                    <p className="text-xs text-text-muted">Ostatnie odświeżenie: <SessionTime value={session.last_refreshed_at} /></p>
                  </div>
                </li>
              ))}
            </ul>}
      <p className="text-xs leading-relaxed text-text-muted">
        Sesja to zapisane logowanie, nie obecność online. Jedno urządzenie może mieć kilka sesji.
        Nazwa urządzenia jest przybliżona. Daty w czasie polskim.
      </p>
    </SettingsSection>
  );
}
