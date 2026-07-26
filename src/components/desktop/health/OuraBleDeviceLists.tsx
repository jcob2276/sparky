import { CheckCircle2, Radio, Wifi } from 'lucide-react';
import type { BleDeviceHit } from '../../../lib/native/bleProbePlugin';

interface Props {
  ouraDevices: BleDeviceHit[];
  otherDevices: BleDeviceHit[];
  disabled: boolean;
  onPair: (device: BleDeviceHit) => void;
}

export function OuraBleDeviceLists({ ouraDevices, otherDevices, disabled, onPair }: Props) {
  return (
    <>
      {ouraDevices.length > 0 && (
        <div className="space-y-2">
          <p className="text-3xs font-extrabold uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
            <CheckCircle2 size={10} /> Wykryte Oura Ring
          </p>
          {ouraDevices.map((device) => (
            <div key={device.address} className="flex items-center justify-between p-3.5 rounded-2xl border border-teal-500/30 bg-teal-500/5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                  <Radio size={16} />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-white">{device.name || 'Oura Ring'}</p>
                  <p className="text-3xs text-slate-400 font-mono">{device.address}</p>
                  <p className="text-3xs text-slate-500">Sygnał: {device.rssi} dBm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPair(device)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs"
              >
                <CheckCircle2 size={13} /> Sparuj
              </button>
            </div>
          ))}
        </div>
      )}

      {otherDevices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-3xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <Wifi size={10} /> Inne urządzenia Bluetooth
          </p>
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {otherDevices.map((device) => (
              <div key={device.address} className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/5">
                <div>
                  <p className="font-semibold text-xs text-slate-300">{device.name || '(bez nazwy)'}</p>
                  <p className="text-3xs text-slate-500 font-mono">{device.address}</p>
                  <p className="text-3xs text-slate-600">{device.rssi} dBm</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPair(device)}
                  disabled={disabled}
                  className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-slate-300 font-bold text-xs"
                >
                  Sparuj
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
