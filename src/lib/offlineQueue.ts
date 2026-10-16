import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notify } from './notify';
import { addQueuedWrite, getQueuedWrites, removeQueuedWrite, saveToDeadLetterQueue } from './offlineQueueStore';

// Dynamic table dispatch requires bypassing the generic table-name constraint.
// This is intentional — the offline queue replays arbitrary serialised writes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynDb = supabase as SupabaseClient<any>;

/**
 * Best-effort network-failure detector. Only errors that look like a genuine
 * connectivity drop get queued for later replay — real app errors (auth, RLS,
 * bad input, validation) must still surface to the user immediately, not sit
 * silently in a queue that will just fail again once "synced".
 */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!err) return false;
  if (typeof err === 'object' && 'name' in err && err.name === 'FunctionsFetchError') return true;
  const message = typeof err === 'object' && 'message' in err && typeof err.message === 'string'
    ? err.message : String(err);
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message);
}

export async function queueOfflineWrite(fn: string, args: Record<string, unknown>, label: string): Promise<void> {
  const ownerId = await currentQueueUser();
  if (!ownerId) throw new Error('Nie można zapisać operacji offline bez dostępnej sesji konta.');
  await addQueuedWrite({ id: crypto.randomUUID(), ownerId, fn, args, label, createdAt: Date.now() });
}

async function currentQueueUser(): Promise<string | null> {
  // Local queue ownership only; the server still authorizes every replay through Auth/RLS.
  try {
    const { data, error } = await supabase.auth.getSession();
    return error ? null : data.session?.user.id ?? null;
  } catch { return null; }
}


/**
 * Calls a Supabase RPC; on a genuine network failure, queues the call (by
 * function name + args — RPCs are plain JSON-serializable calls, so this is
 * generic across any mutation) instead of throwing, so the caller can show
 * "saved offline, will sync" rather than a hard error.
 */
export async function rpcWithOfflineFallback(
  fn: string,
  args: Record<string, unknown>,
  label: string,
): Promise<{ queued: boolean }> {
  try {
    const { error } = await dynDb.rpc(fn, args);
    if (error) throw error;
    return { queued: false };
  } catch (err: unknown) {
    if (isOfflineError(err)) {
      await queueOfflineWrite(fn, args, label);
      return { queued: true };
    }
    throw err;
  }
}

let flushing = false;
let flushAgain = false;
let legacyNoticeShown = false;

export async function flushOfflineQueue(): Promise<void> {
  if (flushing) { flushAgain = true; return; }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushing = true;
  try {
    const ownerId = await currentQueueUser();
    if (!ownerId) return;
    const entries = await getQueuedWrites();
    if (!entries.length) return;
    if (!legacyNoticeShown && entries.some((entry) => !entry.ownerId)) {
      legacyNoticeShown = true;
      notify('Starsze zapisy offline nie mają przypisanego konta. Zachowano je lokalnie bez wysyłania.', 'error');
    }
    let synced = 0;
    for (const entry of entries) {
      if (entry.ownerId !== ownerId) continue;
      if (await currentQueueUser() !== ownerId) break;
      let error: { message: string } | null = null;
      try {
        if (entry.fn.startsWith('table:')) {
          const [_, action, table] = entry.fn.split(':');
          if (!['insert', 'update', 'delete'].includes(action)) throw new Error('Nieobsługiwana operacja tabeli w kolejce offline.');
          const match = entry.args.match;
          if (action !== 'insert' && (!match || typeof match !== 'object' || Array.isArray(match) || !Object.keys(match).length)) {
            throw new Error('Brak filtra rekordu dla operacji offline.');
          }
          if (action === 'insert') {
            const res = await dynDb.from(table).insert((entry.args.payload as Record<string, unknown>) || {});
            error = res.error;
          } else if (action === 'update') {
            const res = await dynDb.from(table).update((entry.args.payload as Record<string, unknown>) || {}).match((entry.args.match as Record<string, unknown>) || {});
            error = res.error;
          } else {
            const res = await dynDb.from(table).delete().match((entry.args.match as Record<string, unknown>) || {});
            error = res.error;
          }
        } else if (entry.fn.startsWith('edge:')) {
          const [_, functionName] = entry.fn.split(':');
          const { data, error: edgeErr } = await supabase.functions.invoke(functionName, { body: entry.args });
          error = edgeErr;
          if (!error && (data?.error || data?.ok === false || data?.success === false)) {
            error = new Error(typeof data?.error === 'string' ? data.error : `Funkcja ${functionName} zgłosiła niepowodzenie zapisu.`);
          }
        } else {
          const res = await dynDb.rpc(entry.fn, entry.args);
          error = res.error;
        }
      } catch (cause) { error = cause instanceof Error ? cause : { message: String(cause) }; }

      if (error) {
        if (await currentQueueUser() !== ownerId) break;
        if (isOfflineError(error)) {
          console.debug(`[offlineQueue] Network offline during replay for ${entry.fn}. Stopping queue flush.`);
          break; // Stop - we are offline again, keep in queue
        } else {
          console.error(`[offlineQueue] Persistent error during replay for ${entry.fn}:`, error);
          // Move to Dead Letter Queue to avoid blocking the entire queue (poison pill prevention)
          await saveToDeadLetterQueue(entry, error);
          await removeQueuedWrite(entry.id);
          notify(`Synchronizacja nie powiodła się dla "${entry.label}". Szczegóły: ${error.message || String(error)}`, 'error');
          continue; // Move to next item
        }
      }
      await removeQueuedWrite(entry.id);
      synced++;
    }
    if (synced > 0) {
      notify(
        synced === 1 ? '1 zaległy zapis offline zsynchronizowany' : `${synced} zaległych zapisów offline zsynchronizowanych`,
        'success',
      );
    }
  } catch (error) {
    flushAgain = false;
    throw error;
  } finally {
    flushing = false;
    if (flushAgain) { flushAgain = false; await flushOfflineQueue(); }
  }
}

/** Call once on app start — flushes anything queued from a previous offline session
 * and retries automatically whenever the browser regains connectivity. */
export function initOfflineSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => { void flushOfflineQueue().catch((error) => console.warn('[offlineQueue] Flush postponed:', error)); };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 0);
  };
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) schedule();
  });
  window.addEventListener('online', flush);
  if (navigator.onLine) schedule();
  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener('online', flush);
    subscription.unsubscribe();
  };
}
