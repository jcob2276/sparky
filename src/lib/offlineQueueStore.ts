const DB_NAME = 'vanguard_offline';
const STORE_NAME = 'queue';
const DLQ_STORE_NAME = 'dead_letter';
const DB_VERSION = 2;

export interface QueueEntry {
  id: string;
  fn: string;
  args: Record<string, unknown>;
  label: string;
  createdAt: number;
  ownerId?: string; // Legacy entries have no owner and must not be replayed automatically.
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DLQ_STORE_NAME)) db.createObjectStore(DLQ_STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addQueuedWrite(entry: QueueEntry): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(entry);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Zapis offline przerwany.'));
    });
  } finally { db.close(); }
}

export async function getQueuedWrites(): Promise<QueueEntry[]> {
  const db = await openDb();
  try {
    const entries = await new Promise<QueueEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueueEntry[]);
      req.onerror = () => reject(req.error);
    });
    return entries.sort((a, b) => a.createdAt - b.createdAt);
  } finally { db.close(); }
}

export async function removeQueuedWrite(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Usuwanie zapisu offline przerwane.'));
    });
  } finally { db.close(); }
}

export async function saveToDeadLetterQueue(entry: QueueEntry, error: unknown): Promise<void> {
  const db = await openDb();
  try {
    const errMsg = error instanceof Error ? error.message
      : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error);
    const errCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null;
    const dlqEntry = { ...entry, failedAt: Date.now(), errorMessage: errMsg, errorCode: errCode };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DLQ_STORE_NAME, 'readwrite');
      tx.objectStore(DLQ_STORE_NAME).add(dlqEntry);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Archiwizacja zapisu offline przerwana.'));
    });
  } finally { db.close(); }
}
