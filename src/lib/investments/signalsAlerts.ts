import type { SignalRow } from './signalsScore';
import type { SignalWindow } from './signalsApi';

const ALERT_KEY = 'sparky_signal_alerts_v2';

interface AlertSnapshot {
  seen: Record<string, string[]>;
}

function readSnapshots(): Record<string, AlertSnapshot> {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, AlertSnapshot>;
  } catch {
    return {};
  }
}

export function freshSignalAlerts(window: SignalWindow, rows: SignalRow[]): SignalRow[] {
  const snapshots = readSnapshots();
  const prior = snapshots[window];
  if (!prior?.seen || typeof prior.seen !== 'object') {
    markSignalAlertsSeen(window, rows);
    return [];
  }
  return rows.filter(row => row.convergent && (row.disclosureIds ?? []).some(id =>
    !Array.isArray(prior.seen[row.ticker]) || !prior.seen[row.ticker].includes(id)));
}

export function markSignalAlertsSeen(window: SignalWindow, rows: SignalRow[]): void {
  const snapshots = readSnapshots();
  const seen: Record<string, string[]> = {};
  for (const row of rows) {
    seen[row.ticker] = [...new Set(row.disclosureIds ?? [])];
  }
  snapshots[window] = { seen };
  try {
    localStorage.setItem(ALERT_KEY, JSON.stringify(snapshots));
  } catch {
    /* private mode */
  }
}

