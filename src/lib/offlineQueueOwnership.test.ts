import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueEntry } from './offlineQueueStore';
import { flushOfflineQueue, initOfflineSync, isOfflineError, queueOfflineWrite, rpcWithOfflineFallback } from './offlineQueue';

type StoredEntry = QueueEntry & { ownerId?: string };
const source = vi.hoisted(() => ({
  userId: 'alice' as string | null, entries: [] as StoredEntry[],
  getSession: vi.fn(), rpc: vi.fn(), invoke: vi.fn(), add: vi.fn(), remove: vi.fn(), deadLetter: vi.fn(),
  onAuthStateChange: vi.fn(), unsubscribe: vi.fn(),
  from: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), match: vi.fn(),
  authCallback: (() => {}) as (event: string, session: { user: { id: string } } | null) => void,
}));
vi.mock('./supabase', () => ({ supabase: {
  auth: { getSession: source.getSession, onAuthStateChange: source.onAuthStateChange },
  rpc: source.rpc, functions: { invoke: source.invoke },
  from: source.from,
} }));
vi.mock('./notify', () => ({ notify: vi.fn() }));
vi.mock('./offlineQueueStore', () => ({
  getQueuedWrites: () => Promise.resolve(source.entries),
  addQueuedWrite: source.add, removeQueuedWrite: source.remove, saveToDeadLetterQueue: source.deadLetter,
}));
function entry(id: string, ownerId?: string): StoredEntry {
  return { id, ownerId, fn: 'save_plan', args: { value: id }, label: 'Plan', createdAt: 1 };
}
beforeEach(() => {
  vi.resetAllMocks(); source.userId = 'alice'; source.entries = [];
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  source.getSession.mockImplementation(() => Promise.resolve({ data: { session: source.userId ? { user: { id: source.userId } } : null }, error: null }));
  source.rpc.mockResolvedValue({ error: null }); source.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  source.from.mockReturnValue({ insert: source.insert, update: source.update, delete: source.delete });
  source.insert.mockResolvedValue({ error: null }); source.match.mockResolvedValue({ error: null });
  source.update.mockReturnValue({ match: source.match }); source.delete.mockReturnValue({ match: source.match });
  source.add.mockImplementation(async (write: StoredEntry) => { source.entries.push(write); });
  source.remove.mockImplementation(async (id: string) => { source.entries = source.entries.filter((write) => write.id !== id); });
  source.onAuthStateChange.mockImplementation((callback: typeof source.authCallback) => {
    source.authCallback = callback; return { data: { subscription: { unsubscribe: source.unsubscribe } } };
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('SDK network failures', () => {
  it('recognizes a Postgrest network error and queues the original write', async () => {
    const error = { message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' };
    expect(isOfflineError(error)).toBe(true);
    expect(isOfflineError({ message: 'new row violates row-level security policy' })).toBe(false);
    source.rpc.mockResolvedValue({ error });
    await expect(rpcWithOfflineFallback('save_plan', { value: 'original' }, 'Plan')).resolves.toEqual({ queued: true });
    expect(source.add).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'alice', fn: 'save_plan', args: { value: 'original' } }));
  });
  it('retains the queued write when the SDK returns a plain network error on replay', async () => {
    source.entries = [entry('network', 'alice')];
    source.rpc.mockResolvedValue({ error: { message: 'TypeError: Failed to fetch', code: '' } });
    await flushOfflineQueue();
    expect(source.entries).toHaveLength(1);
    expect(source.deadLetter).not.toHaveBeenCalled();
    expect(source.remove).not.toHaveBeenCalled();
  });
});

describe('offline write ownership', () => {
  it.each(['table:delete:todo_items', 'table:update:todo_items', 'table:unexpected:todo_items'])('does not execute an unfiltered or unsupported mutation (%s)', async (fn) => {
    source.entries = [{ ...entry('unsafe', 'alice'), fn, args: { payload: { title: 'x' } } }];
    await flushOfflineQueue();
    expect(source.delete).not.toHaveBeenCalled(); expect(source.update).not.toHaveBeenCalled();
    expect(source.deadLetter).toHaveBeenCalledOnce();
  });
  it('replays a valid table update with its original record filter', async () => {
    source.entries = [{ ...entry('edit', 'alice'), fn: 'table:update:todo_items', args: { payload: { title: 'x' }, match: { id: 'task' } } }];
    await flushOfflineQueue();
    expect(source.update).toHaveBeenCalledWith({ title: 'x' });
    expect(source.match).toHaveBeenCalledWith({ id: 'task' });
    expect(source.remove).toHaveBeenCalledWith('edit');
  });
  it('does not acknowledge an edge write whose HTTP success body reports failure', async () => {
    source.entries = [{ ...entry('event', 'alice'), fn: 'edge:calendar-write' }];
    source.invoke.mockResolvedValue({ data: { success: false, error: 'calendar unavailable' }, error: null });
    await flushOfflineQueue();
    expect(source.deadLetter).toHaveBeenCalledWith(expect.objectContaining({ id: 'event' }), expect.objectContaining({ message: 'calendar unavailable' }));
  });
  it('does not lose a sign-in/reconnect trigger arriving during an earlier account flush', async () => {
    source.entries = [entry('alice-write', 'alice'), entry('bob-write', 'bob')];
    let resolveFirst!: (value: { error: null }) => void;
    source.rpc.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    const firstFlush = flushOfflineQueue();
    await vi.waitFor(() => expect(source.rpc).toHaveBeenCalledOnce());
    source.userId = 'bob'; await flushOfflineQueue();
    resolveFirst({ error: null }); await firstFlush;
    await vi.waitFor(() => expect(source.rpc).toHaveBeenCalledTimes(2));
    expect(source.entries).toEqual([]);
  });
  it('attaches the current account to a new queued write', async () => {
    await queueOfflineWrite('save_plan', { value: 1 }, 'Plan');
    expect(source.add).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'alice' }));
  });
  it('does not create an ownerless write when signed out', async () => {
    source.userId = null;
    await expect(queueOfflineWrite('save_plan', {}, 'Plan')).rejects.toThrow();
    expect(source.add).not.toHaveBeenCalled();
  });
  it('does not replay or discard pending work without an authenticated session', async () => {
    source.entries = [entry('a', 'alice')]; source.userId = null;
    await flushOfflineQueue();
    expect(source.rpc).not.toHaveBeenCalled();
    expect(source.remove).not.toHaveBeenCalled(); expect(source.deadLetter).not.toHaveBeenCalled();
  });
  it('replays only the current account and preserves other accounts and legacy entries', async () => {
    source.entries = [entry('alice-write', 'alice'), entry('bob-write', 'bob'), entry('legacy')];
    source.userId = 'bob'; await flushOfflineQueue();
    expect(source.rpc).toHaveBeenCalledExactlyOnceWith('save_plan', { value: 'bob-write' });
    expect(source.entries.map((write) => write.id)).toEqual(['alice-write', 'legacy']);
  });
  it('stops replaying if the account changes during a flush', async () => {
    source.entries = [entry('a1', 'alice'), entry('a2', 'alice')];
    source.rpc.mockImplementationOnce(async () => { source.userId = 'bob'; return { error: null }; });
    await flushOfflineQueue();
    expect(source.rpc).toHaveBeenCalledOnce();
    expect(source.entries.map((write) => write.id)).toEqual(['a2']);
  });
  it('preserves the write if sign-out interrupts a replay with an authentication error', async () => {
    source.entries = [entry('a1', 'alice')];
    source.rpc.mockImplementationOnce(async () => { source.userId = null; return { error: { message: 'JWT expired' } }; });
    await flushOfflineQueue();
    expect(source.remove).not.toHaveBeenCalled(); expect(source.deadLetter).not.toHaveBeenCalled();
  });
  it('handles a thrown network failure without losing the queued write', async () => {
    source.entries = [entry('a1', 'alice')]; source.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(flushOfflineQueue()).resolves.toBeUndefined();
    expect(source.remove).not.toHaveBeenCalled(); expect(source.deadLetter).not.toHaveBeenCalled();
  });
  it('does not remove a write before its dead-letter copy was saved successfully', async () => {
    source.entries = [entry('a1', 'alice')];
    source.rpc.mockResolvedValue({ error: { message: 'validation failed' } });
    source.deadLetter.mockRejectedValue(new Error('storage full'));
    await expect(flushOfflineQueue()).rejects.toThrow('storage full');
    expect(source.remove).not.toHaveBeenCalled();
  });
  it('defers session work outside auth callbacks and cleans up its listeners', async () => {
    vi.useFakeTimers(); source.userId = null;
    const stop = initOfflineSync();
    source.userId = 'alice'; source.entries = [entry('a1', 'alice')];
    source.authCallback('SIGNED_IN', { user: { id: 'alice' } });
    expect(source.getSession).not.toHaveBeenCalled();
    await vi.runAllTimersAsync(); expect(source.rpc).toHaveBeenCalledOnce();
    source.rpc.mockClear(); stop();
    window.dispatchEvent(new Event('online')); await vi.runAllTimersAsync();
    expect(source.rpc).not.toHaveBeenCalled(); expect(source.unsubscribe).toHaveBeenCalledOnce();
  });
});
