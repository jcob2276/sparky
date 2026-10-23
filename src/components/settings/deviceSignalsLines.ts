import { resolveAppName, type DeviceSignalKind, type DeviceSignalsDaySummary } from '@vanguard/domain';
import type { DeviceSignalsStatus } from '../../lib/native/deviceSignalsPlugin';

export interface DeviceSignalRowSpec {
  kind: DeviceSignalKind;
  label: string;
  hint: string;
}

export const DEVICE_SIGNAL_ROWS: DeviceSignalRowSpec[] = [
  { kind: 'screen', label: 'Ekran i odblokowania', hint: 'Włączenia/wyłączenia ekranu — wskaźnik snu i wieczornego scrollowania' },
  { kind: 'battery', label: 'Bateria i ładowanie', hint: 'Poziom co 5%, podłączenie ładowarki, oszczędzanie energii' },
  { kind: 'network', label: 'Sieć', hint: 'Wi-Fi dom/praca (nazwa sieci zostaje na telefonie) lub dane mobilne' },
  { kind: 'steps', label: 'Kroki', hint: 'Licznik kroków (sprzętowy, prawie bez baterii) — wymaga zgody na aktywność' },
  { kind: 'dnd', label: 'Nie przeszkadzać', hint: 'Kiedy tryb DND jest włączony' },
  { kind: 'notif', label: 'Powiadomienia', hint: 'Tylko liczba na aplikację — bez tytułów i treści; wymaga dostępu do powiadomień' },
  { kind: 'audio', label: 'Słuchawki', hint: 'Typ wyjścia audio (Bluetooth / przewodowe) bez nazw urządzeń' },
  { kind: 'light', label: 'Jasność i światło', hint: 'Jeden odczyt co 5 min przy włączonym ekranie (lux + jasność)' },
  { kind: 'traffic', label: 'Transfer danych', hint: 'Ilość danych mobilnych i ogółem co 30 min' },
];

/** Short state note for a collector row, or null when it just works. */
export function rowIssue(kind: DeviceSignalKind, status: DeviceSignalsStatus): string | null {
  if (!status.enabled[kind]) return null;
  if (kind === 'steps') {
    if (!status.stepSensor) return 'Brak czujnika kroków w tym telefonie';
    if (!status.activityPermission) return 'Brak zgody na aktywność fizyczną';
  }
  if (kind === 'notif' && !status.notificationAccess) return 'Brak dostępu do powiadomień';
  if (kind === 'light' && !status.lightSensor) return 'Brak czujnika światła';
  if (kind === 'network' && !status.locationPermission) return 'Bez lokalizacji nie odczytam Wi-Fi dom/praca';
  return null;
}

function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** One-line summaries of today's signals for the card (only non-empty ones). */
export function summaryLines(s: DeviceSignalsDaySummary): string[] {
  const lines: string[] = [];
  if (s.steps > 0) lines.push(`Kroki: ${s.steps.toLocaleString('pl-PL')}`);
  if (s.screenOnMinutes > 0 || s.unlocks > 0) {
    lines.push(`Ekran: ${hm(s.screenOnMinutes)} · ${s.unlocks} odblokowań`);
  }
  if (s.longestScreenOffGap) {
    const g = s.longestScreenOffGap;
    lines.push(`Najdłuższa przerwa ekranu: ${g.from}–${g.to} (${hm(g.minutes)})`);
  }
  if (s.batteryLevel !== null) {
    lines.push(`Bateria: ${s.batteryLevel}%${s.charging ? ' (ładuje)' : ''}${s.batteryMin !== null ? ` · min ${s.batteryMin}%` : ''}`);
  }
  const net: string[] = [];
  if (s.homeWifiMinutes > 0) net.push(`dom ${hm(s.homeWifiMinutes)}`);
  if (s.workWifiMinutes > 0) net.push(`praca ${hm(s.workWifiMinutes)}`);
  if (s.otherWifiMinutes > 0) net.push(`inne Wi-Fi ${hm(s.otherWifiMinutes)}`);
  if (s.cellularMinutes > 0) net.push(`dane ${hm(s.cellularMinutes)}`);
  if (net.length > 0) lines.push(`Sieć: ${net.join(' · ')}`);
  if (s.dndMinutes > 0) lines.push(`Nie przeszkadzać: ${hm(s.dndMinutes)}`);
  if (s.headphonesMinutes > 0) lines.push(`Słuchawki: ${hm(s.headphonesMinutes)}`);
  if (s.notificationsTotal > 0) {
    const top = s.notificationsTop.slice(0, 3).map((t) => `${resolveAppName(t.pkg)} ${t.count}`).join(', ');
    lines.push(`Powiadomienia: ${s.notificationsTotal} (${top})`);
  }
  if (s.avgLux !== null) lines.push(`Światło: śr. ${s.avgLux} lx`);
  if (s.totalMb > 0) lines.push(`Transfer: ${s.totalMb} MB (mobilne ${s.mobileMb} MB)`);
  return lines;
}
