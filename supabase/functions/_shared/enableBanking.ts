/**
 * enableBanking.ts — klient Enable Banking (PSD2 AIS, tylko odczyt).
 * Podpisuje JWT RS256 kluczem z sekretow EB_APP_ID / EB_PRIVATE_KEY (PEM PKCS8) i mapuje transakcje.
 */
const API = 'https://api.enablebanking.com';

interface EbAccountRef { iban?: string; other?: { identification?: string } }
interface EbParty { name?: string }
interface EbAmount { amount: string; currency: string }
export interface EbTransaction {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: EbAmount;
  credit_debit_indicator: 'DBIT' | 'CRDT';
  booking_date?: string;
  value_date?: string;
  creditor?: EbParty;
  debtor?: EbParty;
  creditor_account?: EbAccountRef;
  debtor_account?: EbAccountRef;
  remittance_information?: string[];
}
interface EbAccount { uid: string; account_id?: EbAccountRef; name?: string; currency?: string }
export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  access?: { valid_until?: string };
}
export interface EbBalance { balance_type: string; balance_amount: EbAmount; last_change_date_time?: string }
export interface EbTransactionsPage { transactions?: EbTransaction[]; continuation_key?: string | null }

export class EbError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Nagłówek Retry-After z odpowiedzi banku/Enable Banking (sekundy), jeśli podano. */
    readonly retryAfterSeconds: number | null = null,
    /** Surowe ciało odpowiedzi błędu (do logów i diagnostyki). */
    readonly detail: unknown = null,
  ) { super(message); }
}

/**
 * Limit odczytów PSD2: 429 lub jawny kod limitu. ASPSP_ERROR to ogólny błąd banku.
 * To stan przejściowy (limit dobowy bez obecności użytkownika), a nie awaria połączenia ani wygasła zgoda.
 */
export const isBankReadLimit = (err: unknown): boolean =>
  err instanceof EbError
  && (err.status === 429 || err.code === 'ASPSP_RATE_LIMIT_EXCEEDED');

const b64url = (input: string | Uint8Array): string => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function signingKey(): Promise<CryptoKey> {
  const pem = requiredEnv('EB_PRIVATE_KEY').replace(/\\n/g, '\n');
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function signJwt(nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: requiredEnv('EB_APP_ID') }));
  const body = b64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: nowSeconds, exp: nowSeconds + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signingKey(), new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}

/** Nagłówki PSU (Psu-Ip-Address itd.) oznaczają zapytanie jako wykonane przy obecnym użytkowniku, poza limitem zapytań w tle. */
export type PsuHeaders = Record<string, string>;

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown, extraHeaders: PsuHeaders = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await signJwt()}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof data?.error === 'string' ? data.error : 'UNKNOWN';
    const retry = Number(res.headers.get('retry-after'));
    throw new EbError(res.status, code, `Enable Banking ${method} ${path.split('?')[0]} -> ${res.status} ${code}`,
      Number.isFinite(retry) && retry > 0 ? retry : null, data);
  }
  return data as T;
}

/**
 * Diagnostyka limitu: jedno zapytanie o saldo bez rzucania wyjątkiem. Zwraca status, nagłówki dotyczące limitów
 * i (tylko przy błędzie) ciało odpowiedzi. Treść udanej odpowiedzi (saldo) nigdy nie jest zwracana.
 */
export async function ebProbe(path: string, extraHeaders: PsuHeaders = {}): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${await signJwt()}`, ...extraHeaders } });
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => { if (/^(retry-after|x-ratelimit|ratelimit|date)/i.test(key)) headers[key] = value; });
  return { status: res.status, headers, body: res.ok ? null : await res.json().catch(() => null) };
}

export const ebStartAuth = (params: {
  aspsp: { name: string; country: string }; state: string; redirectUrl: string; validUntil: string;
}) => call<{ url: string; authorization_id: string }>('POST', '/auth', {
  access: { valid_until: params.validUntil },
  aspsp: params.aspsp,
  state: params.state,
  redirect_url: params.redirectUrl,
  psu_type: 'personal',
});

export const ebCreateSession = (code: string) => call<EbSession>('POST', '/sessions', { code });

export const ebBalances = (accountUid: string, psu: PsuHeaders = {}) =>
  call<{ balances?: EbBalance[] }>('GET', `/accounts/${accountUid}/balances`, undefined, psu);

export const ebTransactions = (accountUid: string, dateFrom: string, continuationKey?: string | null, dateTo?: string | null, psu: PsuHeaders = {}) => {
  const q = new URLSearchParams({ date_from: dateFrom });
  if (dateTo) q.set('date_to', dateTo);
  if (continuationKey) q.set('continuation_key', continuationKey);
  return call<EbTransactionsPage>('GET', `/accounts/${accountUid}/transactions?${q}`, undefined, psu);
};

export interface EbAspsp { name: string; country: string; required_psu_headers?: string[]; maximum_consent_validity?: number }

/** Dane banku (m.in. lista wymaganych nagłówków PSU). To zapytanie do Enable Banking, nie do banku, więc nie liczy się do limitu. */
export async function ebAspsp(name: string, country: string): Promise<EbAspsp | null> {
  const res = await call<{ aspsps?: EbAspsp[] }>('GET', `/aspsps?country=${encodeURIComponent(country)}`);
  return res.aspsps?.find((a) => a.name === name) ?? null;
}

/** Banki dostępne w kraju (Polska domyślnie), do wyboru przy dodawaniu kolejnego rachunku. */
export async function ebListAspsps(country: string): Promise<EbAspsp[]> {
  const res = await call<{ aspsps?: EbAspsp[] }>('GET', `/aspsps?country=${encodeURIComponent(country)}`);
  return (res.aspsps ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export interface PsuInfo {
  ip?: string | null; userAgent?: string | null; accept?: string | null;
  acceptLanguage?: string | null; acceptEncoding?: string | null; referer?: string | null;
}

const PSU_FIELDS: Array<[string, keyof PsuInfo]> = [
  ['psu-ip-address', 'ip'], ['psu-user-agent', 'userAgent'], ['psu-accept', 'accept'],
  ['psu-accept-language', 'acceptLanguage'], ['psu-accept-encoding', 'acceptEncoding'], ['psu-referer', 'referer'],
];
const headerCase = (name: string): string => name.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('-');

/**
 * Buduje nagłówki PSU z danych żądania użytkownika. Zasada Enable Banking: wszystkie wymagane przez bank albo żadne.
 * Brak któregokolwiek wymaganego nagłówka (np. geolokalizacji) = null, czyli zapytanie zostaje „w tle”.
 */
export function buildPsuHeaders(info: PsuInfo, required: string[]): PsuHeaders | null {
  const headers: PsuHeaders = {};
  for (const [name, key] of PSU_FIELDS) {
    const value = info[key]?.trim();
    if (value) headers[headerCase(name)] = value;
  }
  const have = new Set(Object.keys(headers).map((k) => k.toLowerCase()));
  if (required.some((r) => !have.has(r.toLowerCase()))) return null;
  return Object.keys(headers).length ? headers : null;
}

export interface BankTransactionRow {
  transaction_id: string;
  amount: number;
  currency: string;
  direction: 'debit' | 'credit';
  booking_date: string | null;
  value_date: string | null;
  counterparty_name: string | null;
  counterparty_iban: string | null;
  remittance: string | null;
  raw: EbTransaction;
}

/** Kwota ze znakiem: obciazenie ujemne, uznanie dodatnie. Kontrahent to druga strona przelewu. */
export function mapTransaction(t: EbTransaction): BankTransactionRow | null {
  // transaction_id służy do pobrania szczegółu i może się zmieniać. Bez trwałego klucza nie zgadujemy tożsamości.
  const id = t.entry_reference ? `entry:${t.entry_reference}` : null;
  if (!id) return null;
  const debit = t.credit_debit_indicator === 'DBIT';
  const abs = Math.abs(Number(t.transaction_amount.amount));
  if (!Number.isFinite(abs)) return null;
  const party = debit ? t.creditor : t.debtor;
  const partyAccount = debit ? t.creditor_account : t.debtor_account;
  const remittance = t.remittance_information?.join(' ').trim();
  return {
    transaction_id: id,
    amount: debit ? -abs : abs,
    currency: t.transaction_amount.currency,
    direction: debit ? 'debit' : 'credit',
    booking_date: t.booking_date ?? null,
    value_date: t.value_date ?? null,
    counterparty_name: party?.name?.trim() || null,
    counterparty_iban: partyAccount?.iban ?? partyAccount?.other?.identification ?? null,
    remittance: remittance || null,
    raw: t,
  };
}
