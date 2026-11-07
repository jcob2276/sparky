import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeExecute } from '../../_shared/supabase.ts';
import { ebCreateSession, ebStartAuth } from '../../_shared/enableBanking.ts';

const DEFAULT_ASPSP = { name: 'Bank Pekao', country: 'PL' };
const CONSENT_DAYS = 180;

function callbackUrl(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/bank-sync`;
}

/** Zaklada polaczenie 'pending' i zwraca adres zgody w banku (uzytkownik zatwierdza w aplikacji banku). */
export async function startConnection(db: SupabaseClient, userId: string): Promise<{ url: string }> {
  const state = crypto.randomUUID();
  const connection = await safeExecute(
    db.from('bank_connections')
      .insert({ user_id: userId, aspsp_name: DEFAULT_ASPSP.name, aspsp_country: DEFAULT_ASPSP.country })
      .select('id').single(),
  );
  await safeExecute(db.from('bank_connection_secrets').insert({ connection_id: connection.id, pending_state: state }));
  const validUntil = new Date(Date.now() + CONSENT_DAYS * 86400e3).toISOString();
  const { url } = await ebStartAuth({ aspsp: DEFAULT_ASPSP, state, redirectUrl: callbackUrl(), validUntil });
  return { url };
}

/** Wymienia kod z przekierowania banku na sesje i zapisuje rachunki. Stan jest jednorazowy. */
export async function completeConnection(db: SupabaseClient, state: string, code: string): Promise<void> {
  const secret = await safeExecute(
    db.from('bank_connection_secrets').select('connection_id').eq('pending_state', state).maybeSingle(),
  );
  if (!secret) throw new Error('Forbidden unknown or used state');
  const connection = await safeExecute(
    db.from('bank_connections').select('id, user_id').eq('id', secret.connection_id).single(),
  );
  const session = await ebCreateSession(code);
  await safeExecute(
    db.from('bank_connection_secrets').update({ session_id: session.session_id, pending_state: null }).eq('connection_id', connection.id),
  );
  await safeExecute(
    db.from('bank_connections').update({
      status: 'active', valid_until: session.access?.valid_until ?? null, last_error: null, updated_at: new Date().toISOString(),
    }).eq('id', connection.id),
  );
  const rows = session.accounts.map((a) => ({
    user_id: connection.user_id,
    connection_id: connection.id,
    account_uid: a.uid,
    iban: a.account_id?.iban ?? null,
    name: a.name ?? null,
    currency: a.currency ?? null,
  }));
  if (rows.length) await safeExecute(db.from('bank_accounts').upsert(rows, { onConflict: 'connection_id,account_uid' }));
}

export async function failConnection(db: SupabaseClient, state: string, reason: string): Promise<void> {
  const secret = await safeExecute(
    db.from('bank_connection_secrets').select('connection_id').eq('pending_state', state).maybeSingle(),
  );
  if (!secret) return;
  await safeExecute(db.from('bank_connections').update({ status: 'failed', last_error: reason }).eq('id', secret.connection_id));
  await safeExecute(db.from('bank_connection_secrets').update({ pending_state: null }).eq('connection_id', secret.connection_id));
}
