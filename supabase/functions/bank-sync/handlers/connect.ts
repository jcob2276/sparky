import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeExecute } from '../../_shared/supabase.ts';
import { ebAspsp, ebCreateSession, ebStartAuth } from '../../_shared/enableBanking.ts';

const DEFAULT_ASPSP = { name: 'Bank Pekao', country: 'PL' };
const CONSENT_DAYS = 180;

function callbackUrl(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/bank-sync`;
}

/** Zaklada polaczenie 'pending' i zwraca adres zgody w banku (uzytkownik zatwierdza w aplikacji banku). */
export async function startConnection(db: SupabaseClient, userId: string, bank?: { name?: unknown; country?: unknown }): Promise<{ url: string }> {
  const aspsp = typeof bank?.name === 'string' && bank.name
    ? { name: bank.name.slice(0, 120), country: typeof bank.country === 'string' && /^[A-Z]{2}$/.test(bank.country) ? bank.country : DEFAULT_ASPSP.country }
    : DEFAULT_ASPSP;
  // Nazwa musi pochodzić z listy Enable Banking; zgoda nie może też trwać dłużej, niż bank dopuszcza.
  const known = aspsp === DEFAULT_ASPSP ? null : await ebAspsp(aspsp.name, aspsp.country);
  if (aspsp !== DEFAULT_ASPSP && !known) throw new Error('Nieznany bank');
  const state = crypto.randomUUID();
  const connection = await safeExecute(
    db.from('bank_connections')
      .insert({ user_id: userId, aspsp_name: aspsp.name, aspsp_country: aspsp.country })
      .select('id').single(),
  );
  await safeExecute(db.from('bank_connection_secrets').insert({ connection_id: connection.id, pending_state: state }));
  const maxSeconds = known?.maximum_consent_validity;
  const consentMs = Math.min(CONSENT_DAYS * 86400e3, maxSeconds ? maxSeconds * 1000 : Infinity);
  const validUntil = new Date(Date.now() + consentMs).toISOString();
  const { url } = await ebStartAuth({ aspsp, state, redirectUrl: callbackUrl(), validUntil });
  return { url };
}

/** Wymienia kod z przekierowania banku na sesje i zapisuje rachunki. Stan jest jednorazowy. */
export async function completeConnection(db: SupabaseClient, state: string, code: string): Promise<void> {
  const secret = await safeExecute(
    db.from('bank_connection_secrets').select('connection_id').eq('pending_state', state).maybeSingle(),
  );
  if (!secret) throw new Error('Forbidden unknown or used state');
  const connection = await safeExecute(
    db.from('bank_connections').select('id, user_id, aspsp_name, aspsp_country').eq('id', secret.connection_id).single(),
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
  // Nowa zgoda zastępuje starsze aktywne połączenia TEGO SAMEGO banku (inne banki zostają) (rachunki przejmujemy po IBAN niżej),
  // inaczej stara zgoda zostałaby „aktywna” i alert o jej wygaśnięciu mylił.
  await safeExecute(
    db.from('bank_connections').update({ status: 'expired', last_note: 'Zastąpione nową zgodą.', updated_at: new Date().toISOString() })
      .eq('user_id', connection.user_id).eq('status', 'active').neq('id', connection.id)
      .eq('aspsp_name', connection.aspsp_name).eq('aspsp_country', connection.aspsp_country),
  );
  for (const a of session.accounts) {
    const iban = a.account_id?.iban?.replace(/\s/g, '').toUpperCase() ?? null;
    const existing = iban ? await safeExecute(db.from('bank_accounts').select('id')
      .eq('user_id', connection.user_id).eq('iban', iban).maybeSingle()) : null;
    const row = {
    user_id: connection.user_id,
    connection_id: connection.id,
    account_uid: a.uid,
    iban,
    name: a.name ?? null,
    currency: a.currency ?? null,
    };
    if (existing) await safeExecute(db.from('bank_accounts').update(row).eq('id', existing.id));
    else await safeExecute(db.from('bank_accounts').upsert(row, { onConflict: 'connection_id,account_uid' }));
  }
}

export async function failConnection(db: SupabaseClient, state: string, reason: string): Promise<void> {
  const secret = await safeExecute(
    db.from('bank_connection_secrets').select('connection_id').eq('pending_state', state).maybeSingle(),
  );
  if (!secret) return;
  await safeExecute(db.from('bank_connections').update({ status: 'failed', last_error: reason }).eq('id', secret.connection_id));
  await safeExecute(db.from('bank_connection_secrets').update({ pending_state: null }).eq('connection_id', secret.connection_id));
}
