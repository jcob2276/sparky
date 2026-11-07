import { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { SessionActivity } from '../../lib/authSessionsApi';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Tabs from '../ui/Tabs';
import SettingsSection from './SettingsSection';
import SessionList from './SessionList';

const RECENT_SESSION_DAYS = 7;
interface ActiveSessionsViewProps {
  sessions?: SessionActivity[];
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  observedAt: number;
  ending: string | null;
  actionError: string | null;
  onRefresh: () => void;
  onEnd: (session: SessionActivity) => void;
  onEndOthers: () => void;
}

export default function ActiveSessionsView({ sessions, loading, refreshing, error, observedAt, ending, actionError,
  onRefresh, onEnd, onEndOthers }: ActiveSessionsViewProps) {
  const [tab, setTab] = useState('active');
  const active = (sessions ?? []).filter(session => session.status === 'active');
  const cutoff = observedAt - RECENT_SESSION_DAYS * 86400_000;
  const isRecent = (session: SessionActivity) => session.is_current
    || Date.parse(session.last_refreshed_at ?? session.created_at ?? '') >= cutoff;
  const recent = active.filter(isRecent);
  const older = active.filter(session => !isRecent(session));
  const history = [...(sessions ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const listProps = { ending, onEnd };
  return (
    <SettingsSection icon={<ShieldCheck size={16} />} title="Aktywne sesje"
      description="Zobacz, gdzie masz dostęp do Sparky, i zakończ wybrane logowanie.">
      <Tabs tabs={[{ key: 'active', label: 'Zalogowane' }, { key: 'history', label: 'Historia' }]}
        active={tab} onChange={setTab} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary" aria-live="polite">
          Sesje z dostępem: <span className="font-semibold tabular-nums text-text-primary">{loading || error ? '—' : active.length}</span>
        </p>
        <Button variant="ghost" size="sm" loading={refreshing} onClick={onRefresh}
          icon={<RefreshCw size={14} />} aria-label="Odśwież aktywne sesje">Odśwież</Button>
      </div>
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      {error ? <p role="alert" className="text-sm text-danger">Nie udało się pobrać aktywnych sesji. Spróbuj ponownie.</p>
        : loading ? <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size="sm" />Pobieram sesje…</div>
          : tab === 'history' ? <>
            {history.length ? <SessionList {...listProps} sessions={history} variant="history" label="Historia logowań" />
              : <p className="text-sm text-text-muted">Brak zapisanych logowań.</p>}
            <p className="text-xs leading-relaxed text-text-muted">Ostatnie zapisane logowania. Historia zakończonych sesji jest dostępna od włączenia tej funkcji.</p>
          </> : <>
            {active.some(session => !session.is_current) && <Button variant="tonal-danger" size="sm"
              loading={ending === 'others'} disabled={ending !== null} onClick={onEndOthers}>Wyloguj pozostałe</Button>}
            {recent.length > 0 && <>
              <p className="text-xs font-medium text-text-secondary">Ostatnio używane ({recent.length})</p>
              <SessionList {...listProps} sessions={recent} variant="active" />
            </>}
            {older.length > 0 && <details className="border-t border-border-custom pt-2">
              <summary className="min-h-11 cursor-pointer py-2 text-sm text-text-secondary">Starsze sesje z dostępem ({older.length})</summary>
              <SessionList {...listProps} sessions={older} variant="active" label="Starsze sesje z dostępem" />
            </details>}
            {active.length === 0 && <p className="text-sm text-text-muted">Brak aktywnych sesji.</p>}
            <p className="text-xs leading-relaxed text-text-muted">Ostatnio używane: ostatnie {RECENT_SESSION_DAYS} dni. Starsze sesje też mogą dawać dostęp, dopóki ich nie wylogujesz.</p>
            <p className="text-xs leading-relaxed text-text-muted">Wylogowanie zatrzymuje odnawianie sesji. Wcześniej wydany token dostępu może działać do wygaśnięcia.</p>
          </>}
      <p className="text-xs leading-relaxed text-text-muted">
        Jedno urządzenie może mieć kilka logowań. Nazwa urządzenia jest przybliżona.
        Czasy użycia mogą pochodzić z automatycznego odświeżania. Daty w czasie polskim.
      </p>
    </SettingsSection>
  );
}
