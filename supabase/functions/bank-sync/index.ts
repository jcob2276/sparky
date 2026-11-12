/**
 * @function bank-sync
 * @trigger POST z aplikacji (start, banks, sync, categorize, set_category) + GET callback z banku (przekierowanie po zgodzie) + cron sync (service role)
 * @role Open banking PSD2 (Enable Banking, tylko odczyt): zgoda w banku, rachunki, salda i pelna historia transakcji
 * @reads bank_connections, bank_connection_secrets, bank_accounts, bank_transactions, bank_category_rules
 * @writes bank_connections, bank_connection_secrets, bank_accounts, bank_transactions, bank_category_rules
 * @consumer Finanse > Bank (FinanceBankCard); dane czytane z bank_* przez RLS
 * @status active
 */
import { HttpError, serveJson } from '../_shared/http.ts';
import { ebListAspsps, type PsuInfo } from '../_shared/enableBanking.ts';
import { resolveUserScope } from '../_shared/supabase.ts';
import { completeConnection, failConnection, startConnection } from './handlers/connect.ts';
import { diagnoseBank, syncUser } from './handlers/sync.ts';
import { recategorize, setCategory } from './handlers/categories.ts';

/** Dane przeglądarki użytkownika z żądania (IP z nagłówków proxy, User-Agent itd.) jako nagłówki PSU. */
function psuInfoFromRequest(req: Request): PsuInfo {
  const h = req.headers;
  return {
    ip: h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent'), accept: h.get('accept'), acceptLanguage: h.get('accept-language'),
    acceptEncoding: h.get('accept-encoding'), referer: h.get('referer') ?? h.get('origin'),
  };
}

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
      return await startConnection(db, scope.userId, body.aspsp && typeof body.aspsp === 'object' ? body.aspsp : undefined);
    }
    case 'banks': {
      if (!scope.userId) throw new HttpError(400, 'Brak userId');
      const country = typeof body.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : 'PL';
      return { banks: (await ebListAspsps(country)).map((b) => ({ name: b.name, country: b.country })) };
    }
    case 'sync': {
      // Użytkownik w aplikacji: jego nagłówki PSU idą do banku (zapytanie „online”). Klucz serwisowy (cron) działa „w tle”,
      // chyba że jawnie poda body.psu (ręczne uruchomienie w imieniu obecnego użytkownika).
      const online: PsuInfo | null = scope.isServiceRole
        ? (body.psu && typeof body.psu === 'object' ? body.psu : null)
        : psuInfoFromRequest(req);
      return { results: await syncUser(db, scope.userId, !scope.isServiceRole || online !== null, online) };
    }
    case 'diagnose':
      if (!scope.isServiceRole) throw new HttpError(400, 'Diagnostyka tylko z kluczem serwisowym');
      return await diagnoseBank(db, body.psu && typeof body.psu === 'object' ? body.psu : null);
    case 'categorize':
      return await recategorize(db, scope.userId);
    case 'set_category':
      return await setCategory(db, scope.userId, body);
    default:
      throw new HttpError(400, 'Nieznana akcja (start | banks | sync | categorize | set_category)');
  }
}, { auth: 'none' }));
