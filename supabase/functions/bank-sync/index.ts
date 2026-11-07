/**
 * @function bank-sync
 * @trigger POST z aplikacji (start, sync) + GET callback z banku (przekierowanie po zgodzie) + cron sync (service role)
 * @role Open banking PSD2 (Enable Banking, tylko odczyt): zgoda w banku, rachunki, salda i pelna historia transakcji
 * @reads bank_connections, bank_connection_secrets, bank_accounts, bank_transactions
 * @writes bank_connections, bank_connection_secrets, bank_accounts, bank_transactions
 * @consumer brak jeszcze UI; dane czytane z bank_* przez RLS
 * @status active
 */
import { HttpError, serveJson } from '../_shared/http.ts';
import { resolveUserScope } from '../_shared/supabase.ts';
import { completeConnection, failConnection, startConnection } from './handlers/connect.ts';
import { syncUser } from './handlers/sync.ts';

// auth 'none': GET callback nie niesie JWT (chroni go jednorazowy, losowy state); POST sprawdza uzytkownika recznie.
Deno.serve(serveJson(async (req, ctx) => {
  const db = ctx.supabase;
  const appUrl = Deno.env.get('APP_URL') ?? '';

  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams;
    const state = params.get('state') ?? '';
    const code = params.get('code');
    if (!state) throw new HttpError(400, 'Brak parametru state');
    let outcome = 'connected';
    if (!code) {
      await failConnection(db, state, params.get('error') ?? 'consent_denied');
      outcome = 'denied';
    } else {
      await completeConnection(db, state, code);
    }
    return appUrl ? Response.redirect(`${appUrl}?bank=${outcome}`, 302) : { bank: outcome };
  }

  const body = await req.json().catch(() => ({}));
  const scope = await resolveUserScope(req, body.userId ?? null);
  switch (body.action) {
    case 'start': {
      if (!scope.userId) throw new HttpError(400, 'Brak userId');
      return await startConnection(db, scope.userId);
    }
    case 'sync':
      return { results: await syncUser(db, scope.userId) };
    default:
      throw new HttpError(400, 'Nieznana akcja (start | sync)');
  }
}, { auth: 'none' }));
