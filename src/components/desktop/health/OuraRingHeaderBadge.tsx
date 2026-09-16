import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, X, Radio } from 'lucide-react';
import { isNativePlatform } from '../../../lib/native/platform';
import { BleProbe } from '../../../lib/native/bleProbePlugin';
import { isOuraBleModeEnabled } from '../../../lib/biometrics/ouraBleSync';
import OuraBleSettingsPanel from './OuraBleSettingsPanel';
import { Pressable } from '../../ui/ControlPrimitives';

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
    if (batteryLevel === null) return <Battery size={14} className="text-text-muted" />;
    if (batteryLevel > 75) return <BatteryFull size={14} className="text-status-success" />;
    if (batteryLevel > 35) return <BatteryMedium size={14} className="text-status-success" />;
    if (batteryLevel > 15) return <BatteryLow size={14} className="text-status-warning" />;
    return <BatteryLow size={14} className="text-status-error animate-pulse" />;
  };

  return (
    <>
      {/* Top-Right Ring Header Badge */}
      <Pressable
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer select-none ${
          isConnected
            ? 'border-status-success/30 bg-status-success/10 hover:bg-status-success/20 text-status-success shadow-sm shadow-status-success/10'
            : 'border-border-custom bg-surface-2/40 hover:bg-surface-2 text-text-secondary'
        }`}
        title="Oura Ring Status (Połączenie BLE)"
      >
        {/* Status Dot */}
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? 'bg-status-success' : 'bg-text-muted'
          }`} />
        </span>

        {/* Ring & Bluetooth Icon */}
        <div className="flex items-center gap-0.5 text-primary">
          <Radio size={13} className={isConnected ? 'text-status-success' : 'text-text-muted'} />
        </div>

        {/* Battery % or Live HR Label */}
        <span className="text-xs font-bold font-mono tracking-tight flex items-center gap-1.5">
          {liveBpm !== null && (
            <span className="text-status-error font-extrabold animate-pulse flex items-center gap-1">
              <span>❤️</span> {liveBpm} <span className="text-2xs text-status-error/80 font-normal">BPM</span>
            </span>
          )}
          {batteryLevel !== null ? `${batteryLevel}%` : isConnected ? 'Oura' : 'Oura'}
        </span>

        {/* Battery Icon */}
        {getBatteryIcon()}
      </Pressable>

      {/* Modal Dialog */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[var(--z-overlay,9999)] flex items-center justify-center p-4 pt-safe pb-safe bg-surface-backdrop/80 backdrop-blur-xs animate-fadeIn">
          {/* Click outside to close */}
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto rounded-3xl border border-border-custom bg-surface-solid p-5 sm:p-6 shadow-2xl animate-scaleUp my-auto">
            {/* Header bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-custom">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Radio size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-text-primary tracking-tight">Połączenie z Oura Ring</h2>
                  <p className="text-3xs text-text-muted">Natywne parowanie Bluetooth BLE</p>
                </div>
              </div>
              <Pressable
                type="button"
                onClick={() => setIsOpen(false)}
                className="touch-manipulation h-8 w-8 rounded-full bg-surface-2/60 hover:bg-surface-2 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                title="Zamknij"
              >
                <X size={16} />
              </Pressable>
            </div>

            {/* Embedded Settings Panel */}
            <OuraBleSettingsPanel />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
