import { useState, useEffect } from 'react';
import { Bluetooth, Battery, BatteryCharging, BatteryLow, BatteryMedium, BatteryFull, X, Radio } from 'lucide-react';
import { isNativePlatform } from '../../../lib/native/platform';
import { BleProbe } from '../../../lib/native/bleProbePlugin';
import { isOuraBleModeEnabled } from '../../../lib/biometrics/ouraBleSync';
import OuraBleSettingsPanel from './OuraBleSettingsPanel';

export default function OuraRingHeaderBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(() => isOuraBleModeEnabled());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Listen to connection status events
    const subConn = BleProbe.addListener('connectionStatus', (evt) => {
      setIsConnected(evt.connected);
      if (!evt.connected) {
        setBatteryLevel(null);
        setLiveBpm(null);
      }
    });

    const subBattery = BleProbe.addListener('ouraBattery', (evt) => {
      setBatteryLevel(evt.percent);
      setIsConnected(true);
    });

    // Listen to live HR events (Daytime HR 1Hz)
    const subHr = BleProbe.addListener('ouraLiveHr', (evt) => {
      if (evt.bpm > 0) {
        setLiveBpm(evt.bpm);
        setIsConnected(true);
      }
    });

    return () => {
      subConn.then((s) => s.remove()).catch(() => {});
      subBattery.then((s) => s.remove()).catch(() => {});
      subHr.then((s) => s.remove()).catch(() => {});
    };
  }, []);

  const getBatteryIcon = () => {
    if (batteryLevel === null) return <Battery size={14} className="text-slate-400" />;
    if (batteryLevel > 75) return <BatteryFull size={14} className="text-emerald-400" />;
    if (batteryLevel > 35) return <BatteryMedium size={14} className="text-emerald-400" />;
    if (batteryLevel > 15) return <BatteryLow size={14} className="text-amber-400" />;
    return <BatteryLow size={14} className="text-rose-400 animate-pulse" />;
  };

  return (
    <>
      {/* Top-Right Ring Header Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer select-none ${
          isConnected
            ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/10'
            : 'border-white/10 bg-black/20 dark:bg-white/5 hover:bg-black/30 dark:hover:bg-white/10 text-slate-300'
        }`}
        title="Oura Ring Status (Połączenie BLE)"
      >
        {/* Status Dot */}
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? 'bg-emerald-400' : 'bg-slate-500'
          }`} />
        </span>

        {/* Ring & Bluetooth Icon */}
        <div className="flex items-center gap-0.5 text-teal-400">
          <Radio size={13} className={isConnected ? 'text-emerald-400' : 'text-slate-400'} />
        </div>

        {/* Battery % or Live HR Label */}
        <span className="text-xs font-bold font-mono tracking-tight flex items-center gap-1.5">
          {liveBpm !== null && (
            <span className="text-rose-400 font-extrabold animate-pulse flex items-center gap-1">
              <span>❤️</span> {liveBpm} <span className="text-[10px] text-rose-300/80 font-normal">BPM</span>
            </span>
          )}
          {batteryLevel !== null ? `${batteryLevel}%` : isConnected ? 'Oura' : 'Oura'}
        </span>

        {/* Battery Icon */}
        {getBatteryIcon()}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-safe pb-safe bg-black/80 backdrop-blur-md animate-fadeIn">
          {/* Click outside to close */}
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-slate-950/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl animate-scaleUp my-auto">
            {/* Header bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Radio size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white tracking-tight">Połączenie z Oura Ring</h2>
                  <p className="text-3xs text-slate-400">Natywne parowanie Bluetooth BLE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Zamknij"
              >
                <X size={16} />
              </button>
            </div>

            {/* Embedded Settings Panel */}
            <OuraBleSettingsPanel />
          </div>
        </div>
      )}
    </>
  );
}
