import { useCallback, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import {
  getWarsawDateString,
  summarizeDeviceSignals,
  type DeviceSignalKind,
  type DeviceSignalsDaySummary,
} from '@vanguard/domain';
import { fetchDeviceSignalsForDay } from '../../lib/deviceSignalsApi';
import { DeviceSignals, type DeviceSignalsStatus, type WifiLabel } from '../../lib/native/deviceSignalsPlugin';
import { flushDeviceSignals } from '../../lib/native/deviceSignalsSync';
import { notify } from '../../lib/notify';

async function loadToday(userId: string): Promise<DeviceSignalsDaySummary> {
  await flushDeviceSignals(userId, true);
  const rows = await fetchDeviceSignalsForDay(userId, getWarsawDateString());
  return summarizeDeviceSignals(rows, Date.now());
}

export function useDeviceSignalsCard(userId: string) {
  const [status, setStatus] = useState<DeviceSignalsStatus | null>(null);
  const [summary, setSummary] = useState<DeviceSignalsDaySummary | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await DeviceSignals.getStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await loadToday(userId));
    } catch {
      setSummary(null);
    }
  }, [userId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount status + summary probe */
    void refreshStatus();
    void refreshSummary();
    /* eslint-enable react-hooks/set-state-in-effect */
    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void refreshStatus();
        void refreshSummary();
      }
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [refreshStatus, refreshSummary]);

  const toggleKind = async (kind: DeviceSignalKind) => {
    if (!status) return;
    const next = !status.enabled[kind];
    setBusy(true);
    try {
      if (next && kind === 'steps' && !status.activityPermission) {
        const { granted } = await DeviceSignals.requestActivityPermission();
        if (!granted) {
          notify('Brak zgody na aktywność fizyczną — włącz w ustawieniach aplikacji.', 'error');
          await DeviceSignals.openAppSettings();
          return;
        }
      }
      await DeviceSignals.setEnabled({ kind, enabled: next });
      if (next && kind === 'notif' && !status.notificationAccess) {
        notify('Włącz Sparky w „Dostęp do powiadomień” (liczymy tylko ilość, bez treści).', 'info');
        await DeviceSignals.openNotificationAccessSettings();
      }
    } catch (err: unknown) {
      console.error('[device-signals] toggle failed:', err);
      notify('Nie udało się zmienić ustawienia kolektora.', 'error');
    } finally {
      await refreshStatus();
      setBusy(false);
    }
  };

  const toggleMaster = async () => {
    if (!status) return;
    setBusy(true);
    try {
      await DeviceSignals.setMaster({ enabled: !status.master });
    } finally {
      await refreshStatus();
      setBusy(false);
    }
  };

  const labelWifi = async (label: WifiLabel) => {
    try {
      await DeviceSignals.labelCurrentWifi({ label });
      notify('Zapisano etykietę sieci (nazwa zostaje na telefonie).', 'success');
    } catch {
      notify('Nie mogę odczytać nazwy sieci — włącz lokalizację i połącz się z Wi-Fi.', 'error');
    }
    await refreshStatus();
  };

  const refreshNow = async () => {
    setBusy(true);
    try {
      await Promise.all([refreshStatus(), refreshSummary()]);
    } finally {
      setBusy(false);
    }
  };

  return { status, summary, busy, toggleKind, toggleMaster, labelWifi, refreshNow };
}
