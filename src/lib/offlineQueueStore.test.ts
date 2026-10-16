import { afterEach, describe, expect, it, vi } from 'vitest';
import { addQueuedWrite, getQueuedWrites, removeQueuedWrite, saveToDeadLetterQueue, type QueueEntry } from './offlineQueueStore';

const entry: QueueEntry = { id: 'a1', ownerId: 'alice', fn: 'save_plan', args: {}, label: 'Plan', createdAt: 1 };
function failingStorage() {
  const failure = new DOMException('storage full', 'QuotaExceededError');
  const transaction = { error: failure, oncomplete: null as (() => void) | null, onerror: null as (() => void) | null, objectStore: vi.fn() };
  const readRequest = { error: failure, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
  const failWrite = () => queueMicrotask(() => transaction.onerror?.());
  transaction.objectStore.mockReturnValue({
    add: failWrite, delete: failWrite,
    getAll: () => { queueMicrotask(() => readRequest.onerror?.()); return readRequest; },
  });
  const database = { transaction: () => transaction, close: vi.fn() };
  const openRequest = { result: database, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
  vi.stubGlobal('indexedDB', { open: () => { queueMicrotask(() => openRequest.onsuccess?.()); return openRequest; } });
  return { failure, database };
}
afterEach(() => vi.unstubAllGlobals());
describe('offline storage failures', () => {
  it('propagates a failed dead-letter write so the original queued write can be retained', async () => {
    const { failure, database } = failingStorage();
    await expect(saveToDeadLetterQueue(entry, new Error('validation failed'))).rejects.toBe(failure);
    expect(database.close).toHaveBeenCalledOnce();
  });
  it.each([
    ['add', () => addQueuedWrite(entry)],
    ['read', () => getQueuedWrites()],
    ['remove', () => removeQueuedWrite('a1')],
  ] as const)('releases the database connection after a failed %s', async (_name, operation) => {
    const { failure, database } = failingStorage();
    await expect(operation()).rejects.toBe(failure);
    expect(database.close).toHaveBeenCalledOnce();
  });
});
