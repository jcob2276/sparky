import { MapPin } from 'lucide-react';
import Button from '../ui/Button';
import type { NativeLocationStatus } from '../../lib/native/locationBufferPlugin';
import { useLocationStatus } from './useLocationStatus';

const LEVEL_CLASS = {
  ok: 'text-success',
  warn: 'text-warning',
  error: 'text-danger',
} as const;

function agoLabel(ms: number): string {
  if (!ms) return 'brak';
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  return `${Math.round(min / 60)} h temu`;
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? 'text-success' : 'text-warning'}>{value}</span>
    </div>
  );
}

function precisionLabel(s: NativeLocationStatus): string {
  if (s.fine) return 'Dokładna';
  return s.coarse ? 'Przybliżona' : 'Brak';
}

const FIX_LABEL: Record<string, string> = {
  grant_foreground: 'Zezwól na lokalizację',
  grant_background: 'Ustaw „Zawsze”',
  open_gps: 'Włącz GPS',
  open_app_settings: 'Ustawienia aplikacji',
};

export default function LocationStatusPanel() {
  const { status, summary, busy, fix, openAppSettings } = useLocationStatus();
  if (!status || !summary) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border-subtle p-3 text-sm">
      <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-text-muted">
        <MapPin size={12} /> Dokładność lokalizacji
      </div>
      <p className={`font-medium ${LEVEL_CLASS[summary.level]}`}>{summary.label}</p>
      {summary.hint && <p className="text-xs text-text-muted">{summary.hint}</p>}

      <Row label="Precyzja" value={precisionLabel(status)} ok={status.fine} />
      <Row label="W tle („Zawsze”)" value={status.background ? 'OK' : 'Wył.'} ok={status.background} />
      <Row label="GPS systemowy" value={status.gpsEnabled ? 'OK' : 'Wył.'} ok={status.gpsEnabled} />
      <Row
        label="Zbieranie"
        value={status.collectorRunning ? (status.mode === 'MOVING' ? 'Ruch' : 'Postój') : 'Wył.'}
        ok={status.collectorRunning}
      />
      <Row
        label="Ostatni fix"
        value={`${agoLabel(status.lastFixAtMs)}${status.lastFixAccuracy > 0 ? ` · ±${Math.round(status.lastFixAccuracy)} m` : ''}`}
        ok={status.lastFixAtMs > 0}
      />
      <Row label="Do wysłania" value={`${status.pending}`} ok={status.pending < 500} />
      {status.rejected > 0 && (
        <p className="text-2xs text-text-muted">
          Odfiltrowano {status.rejected} słabych odczytów (ostatnio: {status.lastReject || '—'}).
        </p>
      )}

      <div className="flex gap-2">
        {summary.action !== 'none' && (
          <Button type="button" variant="primary" loading={busy} onClick={fix} className="flex-1">
            {FIX_LABEL[summary.action]}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => openAppSettings()} className="flex-1">
          Ustawienia systemowe
        </Button>
      </div>
    </div>
  );
}
