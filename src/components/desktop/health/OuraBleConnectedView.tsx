import { Radio } from 'lucide-react';
import type { BleDeviceHit } from '../../../lib/native/bleProbePlugin';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  device: BleDeviceHit | null;
  savedDevice: { address: string; name: string } | null;
  batteryLevel: number | null;
  currentBpm: number | null;
  onDisconnect: () => void;
}

export function OuraBleConnectedView({
  device,
  savedDevice,
  batteryLevel,
  currentBpm,
  onDisconnect,
}: Props) {
  return (
    <div className="rounded-2xl border border-status-success/20 bg-status-success/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-status-success/20 flex items-center justify-center text-status-success">
            <Radio size={20} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-text-primary">{device?.name || savedDevice?.name || 'Oura Ring'}</p>
            <p className="text-3xs text-text-muted font-mono">{device?.address || savedDevice?.address || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-status-success">{batteryLevel !== null ? `${batteryLevel}%` : '–'}</p>
          <p className="text-3xs text-text-muted">Bateria</p>
        </div>
      </div>

      {batteryLevel !== null && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-border-custom/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                batteryLevel > 50 ? 'bg-status-success' : batteryLevel > 20 ? 'bg-status-warning' : 'bg-status-error'
              }`}
              style={{ width: `${batteryLevel}%` }}
            />
          </div>
          <p className="text-3xs text-text-muted">
            {batteryLevel > 20 ? 'Poziom naładowania OK' : 'Wymaga ładowania'}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border-custom/30 bg-surface-2/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-text-primary">Pulsometr na żywo (1 Hz)</p>
            <p className="text-3xs text-text-muted">Strumieniowanie pulsu prosto z palca</p>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-2xs font-extrabold bg-status-success/20 text-status-success border border-status-success/40">
            Automatycznie
          </span>
        </div>
        {currentBpm !== null && (
          <div className="flex items-baseline gap-2 pt-1 border-t border-border-custom/30">
            <span className="text-3xl font-black text-status-error animate-pulse">{currentBpm}</span>
            <span className="text-xs text-text-muted font-bold">BPM</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border-custom/30 bg-surface-2/60 p-3 space-y-2">
        <p className="text-xs font-bold text-text-primary">Dane z nocy (HRV, sen, temperatura, SpO₂)</p>
        <p className="text-3xs text-text-muted">
          Historia synchronizuje się automatycznie po połączeniu i co 15 minut.
        </p>
      </div>

      <Pressable
        type="button"
        onClick={onDisconnect}
        className="w-full py-2 rounded-xl border border-status-error/30 bg-status-error/10 hover:bg-status-error/20 text-status-error font-bold text-xs transition-colors cursor-pointer"
      >
        Rozłącz Oura Ring
      </Pressable>
    </div>
  );
}
