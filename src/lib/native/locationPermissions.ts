/**
 * Runtime permission flow + human-readable status for the native location collector.
 * Order matters on Android: foreground (precise) first, then "Allow all the time".
 */
import { isAndroid } from './platform';
import { LocationBuffer, type NativeLocationStatus } from './locationBufferPlugin';

type LocationLevel = 'ok' | 'warn' | 'error';
type LocationFixAction =
  | 'grant_foreground'
  | 'grant_background'
  | 'open_gps'
  | 'open_app_settings'
  | 'none';

export interface LocationStatusSummary {
  level: LocationLevel;
  label: string;
  hint: string;
  action: LocationFixAction;
}

export async function getLocationStatus(): Promise<NativeLocationStatus | null> {
  if (!isAndroid()) return null;
  try {
    return await LocationBuffer.status();
  } catch {
    return null;
  }
}

/** Requests foreground then background access; returns the final status. */
export async function requestLocationAccess(): Promise<NativeLocationStatus | null> {
  if (!isAndroid()) return null;
  try {
    let status = await LocationBuffer.status();
    if (!status.fine && !status.coarse) status = await LocationBuffer.requestForeground();
    if ((status.fine || status.coarse) && !status.background) {
      status = await LocationBuffer.requestBackground();
    }
    return status;
  } catch (err) {
    console.error('[location] permission flow failed:', err);
    return getLocationStatus();
  }
}

export async function openLocationSystemSettings(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await LocationBuffer.openLocationSettings();
  } catch (err) {
    console.error('[location] open settings failed:', err);
  }
}

/** Single most important problem first, so the UI can show one clear call to action. */
export function summarizeLocationStatus(s: NativeLocationStatus): LocationStatusSummary {
  if (!s.fine && !s.coarse) {
    return {
      level: 'error',
      label: 'Brak uprawnienia do lokalizacji',
      hint: 'Zezwól na lokalizację, żeby Sparky mógł zapisywać miejsca.',
      action: 'grant_foreground',
    };
  }
  if (!s.fine) {
    return {
      level: 'error',
      label: 'Tylko przybliżona lokalizacja',
      hint: 'Włącz „Dokładna lokalizacja” w ustawieniach aplikacji (przybliżona myli się o kilkaset metrów).',
      action: 'open_app_settings',
    };
  }
  if (!s.gpsEnabled) {
    return {
      level: 'error',
      label: 'Lokalizacja systemowa wyłączona',
      hint: 'Włącz Lokalizację w szybkich ustawieniach telefonu.',
      action: 'open_gps',
    };
  }
  if (!s.background) {
    return {
      level: 'warn',
      label: 'Lokalizacja tylko przy otwartej aplikacji',
      hint: 'Wybierz „Zezwalaj zawsze”, inaczej Android ucina zbieranie w tle.',
      action: 'grant_background',
    };
  }
  if (!s.collectorRunning) {
    return {
      level: 'warn',
      label: 'Zbieranie w tle nie działa',
      hint: 'Włącz „Sync w tle” poniżej, żeby uruchomić usługę lokalizacji.',
      action: 'none',
    };
  }
  return { level: 'ok', label: 'Lokalizacja działa', hint: '', action: 'none' };
}
