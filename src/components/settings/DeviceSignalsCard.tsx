import { Activity, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { Card } from '../ui/Card';
import { ToggleChip } from '../ui/ToggleChip';
import type { WifiLabel } from '../../lib/native/deviceSignalsPlugin';
import { DEVICE_SIGNAL_ROWS, rowIssue, summaryLines } from './deviceSignalsLines';
import { useDeviceSignalsCard } from './useDeviceSignalsCard';

const WIFI_LABELS: Array<{ label: WifiLabel; text: string }> = [
  { label: 'home', text: 'Dom' },
  { label: 'work', text: 'Praca' },
  { label: 'other', text: 'Inna' },
];

interface DeviceSignalsCardProps {
  userId: string;
}

export default function DeviceSignalsCard({ userId }: DeviceSignalsCardProps) {
  const { status, summary, busy, toggleKind, toggleMaster, labelWifi, refreshNow } =
    useDeviceSignalsCard(userId);
  const lines = summary ? summaryLines(summary) : [];

  return (
    <Card padding="1rem" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-muted">
          <Activity size={13} /> Dane z telefonu
        </div>
        {status && (
          <ToggleChip active={status.master} variant="success" onClick={toggleMaster} disabled={busy}>
            {status.master ? 'Zbieranie włączone' : 'Zbieranie wyłączone'}
          </ToggleChip>
        )}
      </div>

      <p className="text-2xs text-text-muted">
        Kolektory działają natywnie w tle, zapisują zdarzenia offline i wysyłają paczkami. Nie zbieram treści
        powiadomień, nazw sieci ani dźwięku z mikrofonu.
      </p>

      {status === null ? (
        <p className="text-sm text-text-muted">Ładuję status…</p>
      ) : (
        <div className="space-y-3">
          {DEVICE_SIGNAL_ROWS.map((row) => {
            const issue = rowIssue(row.kind, status);
            return (
              <div key={row.kind} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">{row.label}</div>
                  <div className="text-2xs text-text-muted">{row.hint}</div>
                  {issue && <div className="text-2xs text-warning">{issue}</div>}
                </div>
                <ToggleChip
                  active={status.enabled[row.kind]}
                  variant={issue ? 'warning' : 'success'}
                  onClick={() => { void toggleKind(row.kind); }}
                  disabled={busy || !status.master}
                >
                  {status.enabled[row.kind] ? 'Wł.' : 'Wył.'}
                </ToggleChip>
              </div>
            );
          })}
        </div>
      )}

      {status?.wifiConnected && status.enabled.network && (
        <div className="space-y-2">
          <div className="text-2xs text-text-muted">
            Ta sieć Wi-Fi to: {status.wifiLabel ?? 'bez etykiety'}
          </div>
          <div className="flex gap-2">
            {WIFI_LABELS.map((w) => (
              <ToggleChip
                key={w.label}
                active={status.wifiLabel === w.label}
                onClick={() => { void labelWifi(w.label); }}
              >
                {w.text}
              </ToggleChip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-border-custom pt-3">
        <div className="text-2xs font-black uppercase tracking-wider text-text-muted">Dziś</div>
        {lines.length > 0 ? (
          lines.map((line) => (
            <p key={line} className="text-sm text-text-primary">{line}</p>
          ))
        ) : (
          <p className="text-sm text-text-muted">
            Brak danych — pierwsze zdarzenia pojawią się po kilku minutach działania.
          </p>
        )}
        {status && status.queueSize > 0 && (
          <p className="text-2xs text-text-muted">W kolejce offline: {status.queueSize}</p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        loading={busy}
        onClick={() => { void refreshNow(); }}
        icon={<RefreshCw size={14} />}
        className="w-full"
      >
        Wyślij i odśwież
      </Button>
    </Card>
  );
}
