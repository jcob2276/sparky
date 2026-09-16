import { CheckCircle2, Radio, Wifi } from 'lucide-react';
import type { BleDeviceHit } from '../../../lib/native/bleProbePlugin';
import { Pressable } from '../../ui/ControlPrimitives';

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
          <p className="text-3xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <CheckCircle2 size={10} /> Wykryte Oura Ring
          </p>
          {ouraDevices.map((device) => (
            <div key={device.address} className="flex items-center justify-between p-3.5 rounded-2xl border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Radio size={16} />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-text-primary">{device.name || 'Oura Ring'}</p>
                  <p className="text-3xs text-text-muted font-mono">{device.address}</p>
                  <p className="text-3xs text-text-muted">Sygnał: {device.rssi} dBm</p>
                </div>
              </div>
              <Pressable
                type="button"
                onClick={() => onPair(device)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-extrabold text-xs"
              >
                <CheckCircle2 size={13} /> Sparuj
              </Pressable>
            </div>
          ))}
        </div>
      )}

      {otherDevices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-3xs font-extrabold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <Wifi size={10} /> Inne urządzenia Bluetooth
          </p>
          <div className="max-h-52 overflow-y-auto space-y-1.5">
            {otherDevices.map((device) => (
              <div key={device.address} className="flex items-center justify-between p-2.5 rounded-xl border border-border-custom/30 bg-surface-2/40">
                <div>
                  <p className="font-semibold text-xs text-text-secondary">{device.name || '(bez nazwy)'}</p>
                  <p className="text-3xs text-text-muted font-mono">{device.address}</p>
                  <p className="text-3xs text-text-muted">{device.rssi} dBm</p>
                </div>
                <Pressable
                  type="button"
                  onClick={() => onPair(device)}
                  disabled={disabled}
                  className="px-3 py-1.5 rounded-xl border border-border-custom/50 bg-surface-2/70 hover:bg-surface-2 disabled:opacity-40 text-text-secondary font-bold text-xs"
                >
                  Sparuj
                </Pressable>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
