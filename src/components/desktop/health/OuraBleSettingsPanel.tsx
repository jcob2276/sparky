import { useState, useEffect } from 'react';
import { Bluetooth, RefreshCw, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { isNativePlatform } from '../../../lib/native/platform';
import { BleProbe } from '../../../lib/native/bleProbePlugin';
import { isOuraBleModeEnabled, setOuraBleModeEnabled } from '../../../lib/biometrics/ouraBleSync';

export default function OuraBleSettingsPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [deviceFound, setDeviceFound] = useState<string | null>(null);
  const [paired, setPaired] = useState(() => isOuraBleModeEnabled());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [liveLog, setLiveLog] = useState<string>('Brak aktywnego połączenia');

  const [deviceAddress, setDeviceAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handlePairToggle = async () => {
    const nextState = !paired;
    setPaired(nextState);
    setOuraBleModeEnabled(nextState);

    if (nextState) {
      setLiveLog('Inicjalizacja połączenia GATT z Oura...');
      if (deviceAddress && isNativePlatform()) {
        try {
          await BleProbe.connectDevice({ address: deviceAddress });
        } catch (err: any) {
          setLiveLog(`Błąd połączenia: ${err?.message || 'Nieznany'}`);
        }
      } else {
        setLiveLog('Skanowanie wymagane — najpierw wyszukaj urządzenie.');
      }
    } else {
      setBatteryLevel(null);
      setIsConnected(false);
      setLiveLog('Rozłączono z Oura Direct BLE.');
      if (isNativePlatform()) {
        await BleProbe.disconnectDevice().catch(() => {});
      }
    }
  };

  useEffect(() => {
    if (!isNativePlatform()) return;

    // 1. Device discovered during scan
    const sub1 = BleProbe.addListener('deviceFound', (device) => {
      if (device.ouraLike) {
        setDeviceFound(device.name || device.address);
        setDeviceAddress(device.address);
        setIsScanning(false);
        setLiveLog(`Znaleziono Oura Ring (${device.address})`);
      }
    });

    // 2. Scan finished (timeout elapsed)
    const sub2 = BleProbe.addListener('scanFinished', () => {
      setIsScanning(false);
    });

    // 3. Connection status change
    const sub3 = BleProbe.addListener('connectionStatus', (evt) => {
      setIsConnected(evt.connected);
      if (evt.connected) {
        setPaired(true);
        setOuraBleModeEnabled(true);
        setLiveLog('Połączono GATT. Wysyłanie zapytania o baterię i tętno live...');
        // Request battery command: 0c 00
        BleProbe.writeCommand({ hex: '0c00' }).catch(() => {});
      } else {
        setLiveLog('Połączenie GATT przerwane.');
      }
    });

    // 4. Notifications from Oura GATT
    const sub4 = BleProbe.addListener('ouraBleNotification', (evt) => {
      const hex = (evt.hex || '').toLowerCase();
      setLiveLog(`Pakiet BLE: ${hex.slice(0, 20)}...`);

      // 0d response: battery payload [0d, level, volt_low, volt_high, is_charging]
      if (hex.startsWith('0d') && hex.length >= 4) {
        const levelPct = parseInt(hex.slice(2, 4), 16);
        if (!isNaN(levelPct) && levelPct >= 0 && levelPct <= 100) {
          setBatteryLevel(levelPct);
          setLiveLog(`Odczyt baterii Oura: ${levelPct}%`);
        }
      }
    });

    return () => {
      sub1.then((s) => s.remove()).catch(() => {});
      sub2.then((s) => s.remove()).catch(() => {});
      sub3.then((s) => s.remove()).catch(() => {});
      sub4.then((s) => s.remove()).catch(() => {});
    };
  }, []);

  const handleStartScan = async () => {
    if (!isNativePlatform()) return;
    setIsScanning(true);
    setDeviceFound(null);
    setDeviceAddress(null);
    setLiveLog('Skanowanie nagłówków BLE (UUID 98ED0001)...');

    try {
      await BleProbe.requestPermissions();
      await BleProbe.startScan({ durationMs: 10000 });
    } catch (err: any) {
      setIsScanning(false);
      setLiveLog(`Błąd skanowania: ${err?.message || 'Brak uprawnień BLE'}`);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5 text-white shadow-2xl backdrop-blur-xl space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Bluetooth size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white">Oura Ring Direct BLE (Gen 3/4)</h3>
            <p className="text-3xs text-slate-400">Bezpośrednia synchronizacja Bluetooth za 0 zł / miesiąc (Bez Chmury Oury)</p>
          </div>
        </div>

        <span
          className={`text-3xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
              : paired
              ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}
        >
          {isConnected ? 'Połączono (Live BLE)' : paired ? 'Zapisano Ring BLE' : 'Gotowy do podłączenia'}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Hardware Status */}
        <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-3xs uppercase tracking-wider">
            <Cpu size={12} className="text-teal-400" /> Status Sprzętu
          </div>
          <p className="font-bold text-white text-sm">
            {deviceFound ? `Wykryto: ${deviceFound}` : isScanning ? 'Skanowanie w toku...' : 'Oura Ring Direct'}
          </p>
          <p className="text-3xs text-slate-400 truncate">{liveLog}</p>
        </div>

        {/* Battery & Status */}
        <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-3xs uppercase font-bold tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-teal-400" /> Stan Baterii Oura Ring
            </span>
            <span className="font-bold text-teal-400">
              {batteryLevel !== null ? `${batteryLevel}%` : isConnected ? 'Odczytywanie...' : 'Brak połączenia'}
            </span>
          </div>

          {/* Battery level progress bar */}
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden my-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (batteryLevel ?? 0) > 50
                  ? 'bg-emerald-400'
                  : (batteryLevel ?? 0) > 20
                  ? 'bg-amber-400'
                  : (batteryLevel ?? 0) > 0
                  ? 'bg-rose-500'
                  : 'bg-white/10'
              }`}
              style={{ width: `${batteryLevel ?? 0}%` }}
            />
          </div>

          <div className="flex justify-between text-3xs text-slate-400">
            <span>
              {batteryLevel !== null
                ? batteryLevel > 20
                  ? '🟢 Poziom naładowania OK'
                  : '🔴 Wymaga ładowania'
                : isConnected
                ? '🟡 Wysyłanie komendy 0x0C...'
                : 'Zabezpieczenie AES-128 Ready'}
            </span>
            <span>{batteryLevel !== null ? 'Próbkowanie BLE' : 'Klucz: APK'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleStartScan}
          disabled={isScanning || !isNativePlatform()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={isScanning ? 'animate-spin text-teal-400' : 'text-slate-400'} />
          {isScanning ? 'Skanowanie BLE...' : 'Szukaj Oura Ring'}
        </button>

        {!paired ? (
          <button
            type="button"
            onClick={handlePairToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 transition-transform active:scale-95 cursor-pointer"
          >
            <CheckCircle2 size={14} /> Aktywuj Połączenie Direct
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePairToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-colors cursor-pointer"
          >
            Rozłącz BLE
          </button>
        )}
      </div>
    </div>
  );
}
