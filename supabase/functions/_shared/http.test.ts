import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { HttpError, serveJson } from './http.ts';

Deno.test('expected input failures preserve their HTTP status, message and CORS without leaking upstream errors', async () => {
  const previousUrl = Deno.env.get('SUPABASE_URL'), previousKey = Deno.env.get('SB_SECRET_KEY');
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co'); Deno.env.set('SB_SECRET_KEY', 'test-key');
  try {
    const handler = serveJson(async () => { throw new HttpError(409, 'Odśwież zmieniony plan.'); }, { auth: 'none' });
    const response = await handler(new Request('https://example.test', { method: 'POST' }));
    assertEquals(response.status, 409);
    assertEquals(await response.json(), { error: 'Odśwież zmieniony plan.' });
    assertEquals(response.headers.get('content-type')?.includes('application/json'), true);
    assertEquals(response.headers.has('access-control-allow-origin'), true);
  } finally {
    if (previousUrl == null) Deno.env.delete('SUPABASE_URL'); else Deno.env.set('SUPABASE_URL', previousUrl);
    if (previousKey == null) Deno.env.delete('SB_SECRET_KEY'); else Deno.env.set('SB_SECRET_KEY', previousKey);
  }
});
