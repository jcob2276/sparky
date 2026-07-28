import { Radio } from 'lucide-react';
import type { BleDeviceHit } from '../../../lib/native/bleProbePlugin';

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
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio size={20} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-white">{device?.name || savedDevice?.name || 'Oura Ring'}</p>
            <p className="text-3xs text-slate-400 font-mono">{device?.address || savedDevice?.address || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-emerald-400">{batteryLevel !== null ? `${batteryLevel}%` : '–'}</p>
          <p className="text-3xs text-slate-400">Bateria</p>
        </div>
      </div>

      {batteryLevel !== null && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                batteryLevel > 50 ? 'bg-emerald-400' : batteryLevel > 20 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${batteryLevel}%` }}
            />
          </div>
          <p className="text-3xs text-slate-400">
            {batteryLevel > 20 ? 'Poziom naładowania OK' : 'Wymaga ładowania'}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Pulsometr na żywo (1 Hz)</p>
            <p className="text-3xs text-slate-400">Strumieniowanie pulsu prosto z palca</p>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-2xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Automatycznie
          </span>
        </div>
        {currentBpm !== null && (
          <div className="flex items-baseline gap-2 pt-1 border-t border-white/10">
            <span className="text-3xl font-black text-rose-400 animate-pulse">{currentBpm}</span>
            <span className="text-xs text-slate-400 font-bold">BPM</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
        <p className="text-xs font-bold text-white">Dane z nocy (HRV, sen, temperatura, SpO₂)</p>
        <p className="text-3xs text-slate-400">
          Historia synchronizuje się automatycznie po połączeniu i co 15 minut.
        </p>
      </div>

      <button
        type="button"
        onClick={onDisconnect}
        className="w-full py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-colors cursor-pointer"
      >
        Rozłącz Oura Ring
      </button>
    </div>
  );
}
