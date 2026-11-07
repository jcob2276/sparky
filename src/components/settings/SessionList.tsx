import { Monitor, Smartphone } from 'lucide-react';
import type { SessionActivity } from '../../lib/authSessionsApi';
import { formatLongDateWarsaw, warsawTimeOfDay } from '../../lib/date';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { sessionDeviceLabel, sessionMethodLabel } from './sessionDeviceLabel';

interface SessionListProps {
  sessions: SessionActivity[];
  variant: 'active' | 'history';
  ending: string | null;
  onEnd: (session: SessionActivity) => void;
  label?: string;
}

function SessionTime({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return <time dateTime={value}>{formatLongDateWarsaw(value)} · {warsawTimeOfDay(value)}</time>;
}

export default function SessionList({ sessions, variant, ending, onEnd, label = 'Zalogowane sesje' }: SessionListProps) {
  return <ul aria-label={label} className="max-h-96 divide-y divide-border-custom overflow-y-auto">
    {sessions.map(session => {
      const DeviceIcon = /Android|iPhone|iPad|iPod/i.test(session.user_agent ?? '') ? Smartphone : Monitor;
      const device = sessionDeviceLabel(session.user_agent);
      return <li key={session.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
        <DeviceIcon size={18} className="mt-1 shrink-0 text-text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{device}</p>
            {session.is_current && <Badge variant="tag">Ta sesja</Badge>}
            {variant === 'history' && <span className="text-xs text-text-secondary">
              {session.status === 'ended' ? 'Zakończona' : session.status === 'expired' ? 'Wygasła' : 'Nadal zalogowana'}
            </span>}
          </div>
          <p className="break-all text-xs text-text-secondary">IP: {session.ip || 'Brak danych'}</p>
          <p className="text-xs text-text-secondary">Sposób logowania: <span>{sessionMethodLabel(session.authentication_methods)}</span></p>
          <p className="text-xs text-text-muted">Logowanie: <SessionTime value={session.created_at} /></p>
          <p className="text-xs text-text-muted">Ostatnie użycie sesji: <SessionTime value={session.last_refreshed_at} /></p>
          {session.ended_at && <p className="text-xs text-text-muted">Zakończenie: <SessionTime value={session.ended_at} /></p>}
          {variant === 'active' && <Button variant="tonal-danger" size="sm" className="mt-2"
            aria-label={`Wyloguj sesję ${device}`} disabled={ending !== null}
            loading={ending === session.id} onClick={() => onEnd(session)}>Wyloguj</Button>}
        </div>
      </li>;
    })}
  </ul>;
}
