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
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

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

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await signJwt()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof data?.error === 'string' ? data.error : 'UNKNOWN';
    throw new EbError(res.status, code, `Enable Banking ${method} ${path.split('?')[0]} -> ${res.status} ${code}`);
  }
  return data as T;
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

export const ebBalances = (accountUid: string) =>
  call<{ balances?: EbBalance[] }>('GET', `/accounts/${accountUid}/balances`);

export const ebTransactions = (accountUid: string, dateFrom: string, continuationKey?: string | null) => {
  const q = new URLSearchParams({ date_from: dateFrom });
  if (continuationKey) q.set('continuation_key', continuationKey);
  return call<EbTransactionsPage>('GET', `/accounts/${accountUid}/transactions?${q}`);
};

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
  const id = t.transaction_id ?? t.entry_reference;
  if (!id) return null;
  const debit = t.credit_debit_indicator === 'DBIT';
  const abs = Math.abs(Number(t.transaction_amount.amount));
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
