import { useEffect, useRef, useState } from 'react';
import { getSavedOuraDevice, saveOuraDevice, clearSavedOuraDevice, isOuraBleModeEnabled, setOuraBleModeEnabled } from '../../../lib/biometrics/ouraBleSync';
import { BleProbe, type BleDeviceHit } from '../../../lib/native/bleProbePlugin';
import { isNativePlatform } from '../../../lib/native/platform';
import { confirmDialog } from '../../../lib/notify';

export type OuraConnectionState = 'idle' | 'scanning' | 'found' | 'connecting' | 'connected' | 'error';

export function useOuraBleSettings() {
  const savedDevice = getSavedOuraDevice();
  const [connectedDevice, setConnectedDevice] = useState<BleDeviceHit | null>(() =>
    savedDevice ? { address: savedDevice.address, name: savedDevice.name, rssi: 0, ouraLike: true } : null
  );
  const [state, setState] = useState<OuraConnectionState>(() =>
    isOuraBleModeEnabled() && savedDevice ? 'connected' : 'idle'
  );
  const [devices, setDevices] = useState<BleDeviceHit[]>([]);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState(() =>
    isOuraBleModeEnabled() && savedDevice
      ? `Połączono z ${savedDevice.name}`
      : 'Kliknij „Szukaj”, aby znaleźć Oura Ring'
  );
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [needsAdoption, setNeedsAdoption] = useState(false);
  const subscriptions = useRef<Array<Promise<{ remove: () => void }>>>([]);

  useEffect(() => {
    const active = subscriptions.current;
    return () => active.forEach((sub) => sub.then((item) => item.remove()).catch(() => {}));
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;
    const connection = BleProbe.addListener('connectionStatus', (event) => {
      if (event.connected) {
        setState('connected');
        setOuraBleModeEnabled(true);
        setStatusMsg('Połączono! Oczekiwanie na odczyt baterii...');
      } else {
        setState('idle');
        setBatteryLevel(null);
        setStatusMsg('Połączenie GATT przerwane. Spróbuj ponownie.');
      }
    });
    const battery = BleProbe.addListener('ouraBattery', (event) => {
      setBatteryLevel(event.percent);
      setStatusMsg(`Połączono — bateria: ${event.percent}%`);
    });
    const error = BleProbe.addListener('connectionError', (event) => {
      setState('error');
      setNeedsAdoption(event.error?.includes('świadomego ponownego sparowania') ?? false);
      setStatusMsg(event.error || 'Wymagane sparowanie. Połóż pierścień na ładowarce.');
    });
    subscriptions.current.push(connection, battery, error);

    const saved = getSavedOuraDevice();
    if (saved && isOuraBleModeEnabled()) {
      setConnectedDevice({ address: saved.address, name: saved.name, rssi: 0, ouraLike: true });
      setState('connecting');
      setStatusMsg(`Automatyczne łączenie z ${saved.name}...`);
      BleProbe.connectDevice({ address: saved.address }).catch(() => setState('idle'));
    }
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;
    const hr = BleProbe.addListener('ouraLiveHr', (event) => {
      if (event.bpm > 0) setCurrentBpm(event.bpm);
    });
    return () => {
      hr.then((item) => item.remove()).catch(() => {});
    };
  }, []);

  const scan = async () => {
    if (!isNativePlatform()) {
      setStatusMsg('Skanowanie BLE jest dostępne tylko w aplikacji Android.');
      return;
    }
    setState('scanning');
    setDevices([]);
    setStatusMsg('Skanowanie urządzeń Bluetooth w pobliżu...');
    const found = BleProbe.addListener('deviceFound', (device) => {
      setDevices((previous) => previous.some((item) => item.address === device.address)
        ? previous.map((item) => item.address === device.address ? device : item)
        : [...previous, device]);
    });
    const finished = BleProbe.addListener('scanFinished', () => {
      setState('found');
      setStatusMsg('Skanowanie zakończone. Wybierz Oura Ring.');
      found.then((item) => item.remove()).catch(() => {});
      finished.then((item) => item.remove()).catch(() => {});
    });
    try {
      await BleProbe.requestPermissions();
      await BleProbe.startScan({ durationMs: 10_000 });
    } catch (error: any) {
      setState('error');
      setStatusMsg(`Błąd skanowania: ${error?.message || 'Brak uprawnień Bluetooth'}`);
    }
  };

  const pair = async (device: BleDeviceHit) => {
    setNeedsAdoption(false);
    saveOuraDevice(device.address, device.name);
    setConnectedDevice(device);
    setState('connecting');
    setStatusMsg(`Łączenie z ${device.name || device.address}...`);
    try {
      await BleProbe.connectDevice({ address: device.address });
    } catch (error: any) {
      setState('error');
      setStatusMsg(`Błąd połączenia: ${error?.message || 'Nieznany błąd'}`);
    }
  };

  const adopt = async () => {
    const address = connectedDevice?.address || savedDevice?.address;
    if (!address) return;
    const confirmed = await confirmDialog(
      'Ponowne sparowanie zapisze nowy klucz w pierścieniu. Może rozłączyć go z inną aplikacją. Kontynuować?'
    );
    if (!confirmed) return;
    setNeedsAdoption(false);
    setState('connecting');
    setStatusMsg('Bezpieczne ponowne parowanie pierścienia...');
    try {
      await BleProbe.adoptDevice({ address });
    } catch (error: any) {
      setState('error');
      setStatusMsg(`Błąd ponownego parowania: ${error?.message || 'Nieznany błąd'}`);
    }
  };

  const disconnect = async () => {
    await BleProbe.disconnectDevice().catch(() => {});
    clearSavedOuraDevice();
    setOuraBleModeEnabled(false);
    setState('idle');
    setDevices([]);
    setConnectedDevice(null);
    setBatteryLevel(null);
    setStatusMsg('Rozłączono z Oura Ring.');
  };

  return {
    savedDevice, connectedDevice, state, devices, batteryLevel, statusMsg,
    currentBpm, needsAdoption,
    ouraDevices: devices.filter((device) => device.ouraLike),
    otherDevices: devices.filter((device) => !device.ouraLike),
    scan, pair, adopt, disconnect,
  };
}
