import { getTodayWarsaw } from '../date';

const LIMIT = 120;
const KEY = 'sparky_analyst_quota_v1';

interface StoredQuota {
  month: string;
  used: number;
}

function read(): StoredQuota {
  const month = getTodayWarsaw().slice(0, 7);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { month, used: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { month, used: 0 };
    const row = parsed as { month?: unknown; used?: unknown };
    if (row.month !== month || typeof row.used !== 'number') return { month, used: 0 };
    return { month, used: row.used };
  } catch {
    return { month, used: 0 };
  }
}

export function analystQuota(): { used: number; limit: number; remaining: number } {
  const row = read();
  return { used: row.used, limit: LIMIT, remaining: Math.max(0, LIMIT - row.used) };
}

export function consumeAnalystQuota(): boolean {
  const row = read();
  if (row.used >= LIMIT) return false;
  localStorage.setItem(KEY, JSON.stringify({ month: row.month, used: row.used + 1 }));
  return true;
}
