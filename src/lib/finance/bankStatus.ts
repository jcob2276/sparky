export type BankConnectionStatus = 'pending' | 'active' | 'expired' | 'failed';

export type BankHealth =
  | { kind: 'none' }
  | { kind: 'ok' | 'expiring' | 'expired' | 'failed'; daysLeft: number | null };

/** Na tyle dni przed końcem zgody Sparky zaczyna prosić o odnowienie. */
const BANK_EXPIRING_DAYS = 14;

const DAY_MS = 86_400_000;

/** Stan zgody PSD2 na podstawie statusu i daty ważności. Zgoda wygasa sama, więc data liczy się bardziej niż status. */
export function bankHealth(
  connection: { status: BankConnectionStatus; valid_until: string | null } | null,
  now: number = Date.now(),
): BankHealth {
  if (!connection) return { kind: 'none' };
  const until = connection.valid_until ? Date.parse(connection.valid_until) : null;
  const daysLeft = until == null || Number.isNaN(until) ? null : Math.ceil((until - now) / DAY_MS);
  if (connection.status === 'failed') return { kind: 'failed', daysLeft };
  if (connection.status === 'expired' || (daysLeft != null && daysLeft <= 0)) return { kind: 'expired', daysLeft };
  if (daysLeft != null && daysLeft <= BANK_EXPIRING_DAYS) return { kind: 'expiring', daysLeft };
  return { kind: 'ok', daysLeft };
}

/** Czy użytkownik powinien odnowić zgodę (przycisk "Odnów połączenie"). */
export function needsRenewal(health: BankHealth): boolean {
  return health.kind === 'expiring' || health.kind === 'expired' || health.kind === 'failed';
}
