import { invokeEdge } from './supabase';
import { NETWORK_TIMEOUT_MS } from './constants';

/** HTTP 200 can still mean skipped synchronization or a failed user computation. */
export function assertSyncSucceeded(response: unknown): void {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Brak potwierdzenia synchronizacji.');
  }
  const result = response as Record<string, unknown>;
  if (result.ok === false || result.success === false || result.skipped === true || result.error) {
    const reason = typeof result.reason === 'string' ? result.reason
      : typeof result.error === 'string' ? result.error : 'Synchronizacja nie została wykonana.';
    throw new Error(reason);
  }
  for (const row of Array.isArray(result.results) ? result.results : []) {
    if (row && typeof row === 'object' && typeof row.error === 'string' && row.error) {
      throw new Error(row.error);
    }
  }
  if (result.ok !== true && result.success !== true) throw new Error('Brak potwierdzenia synchronizacji.');
}

/** Shared raw edge-function call for sync actions — was reimplemented independently
 *  in DesktopDashboard.syncAll and useDailyStrainRefresh.refresh (same auth-token
 *  extraction + fetch + timeout + error-shape logic, copy-pasted twice). */
async function callEdgeFunction(fn: string, body: Record<string, unknown> = {}): Promise<void> {
  const response = await invokeEdge(fn, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
  assertSyncSucceeded(response);
}

export function syncOura(userId: string): Promise<void> {
  return callEdgeFunction('sync', { service: 'oura', userId });
}

export function syncStrava(): Promise<void> {
  return callEdgeFunction('sync', { service: 'strava' });
}

export function syncCalendar(userId: string): Promise<void> {
  return callEdgeFunction('sync', { service: 'calendar', userId });
}

export function computeDailyStrain(userId: string, days = 2): Promise<void> {
  return callEdgeFunction('vanguard-nightly?action=compute-daily-strain', { userId, days });
}
