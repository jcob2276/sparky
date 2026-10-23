import { useCallback, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import type { NativeLocationStatus } from '../../lib/native/locationBufferPlugin';
import {
  getLocationStatus,
  openLocationSystemSettings,
  requestLocationAccess,
  summarizeLocationStatus,
  type LocationStatusSummary,
} from '../../lib/native/locationPermissions';
import { openBackgroundLocationSettings } from '../../lib/native/backgroundSync';

export function useLocationStatus() {
  const [status, setStatus] = useState<NativeLocationStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setStatus(await getLocationStatus());
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount probe of native permission state */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void refresh();
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [refresh]);

  const summary: LocationStatusSummary | null = status ? summarizeLocationStatus(status) : null;

  const fix = useCallback(async () => {
    if (!summary) return;
    setBusy(true);
    try {
      if (summary.action === 'grant_foreground' || summary.action === 'grant_background') {
        const next = await requestLocationAccess();
        setStatus(next);
        // Dialog is suppressed after "don't ask again" -> send the user to app settings.
        if (summary.action === 'grant_foreground' && next && !next.fine && !next.coarse) {
          await openBackgroundLocationSettings();
        }
      } else if (summary.action === 'open_gps') {
        await openLocationSystemSettings();
      } else if (summary.action === 'open_app_settings') {
        await openBackgroundLocationSettings();
      }
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [summary, refresh]);

  return { status, summary, busy, fix, refresh, openAppSettings: openBackgroundLocationSettings };
}
