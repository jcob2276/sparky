#!/usr/bin/env node
/**
 * Jednorazowa rejestracja webhooka Fathom -> edge function `fathom-webhook`.
 * Klucz API Fathom (Ustawienia -> API Access -> "sparky") wpisujesz po uruchomieniu; nic nie trafia do repo ani logów.
 * Sekret `whsec_...` z odpowiedzi Fathom od razu ląduje w Supabase jako FATHOM_WEBHOOK_SECRET (nie jest wypisywany).
 */
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';

const PROJECT_REF = 'pdvqkgfsqziqlhptatgf';
const DESTINATION = `https://${PROJECT_REF}.supabase.co/functions/v1/fathom-webhook`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const apiKey = await new Promise((resolve) => rl.question('Klucz API Fathom: ', resolve));
rl.close();
if (!apiKey.trim()) throw new Error('Brak klucza API');

const res = await fetch('https://api.fathom.ai/external/v1/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey.trim() },
  body: JSON.stringify({
    destination_url: DESTINATION,
    triggered_for: ['my_recordings'],
    include_transcript: true,
    include_summary: true,
    include_action_items: false,
    include_crm_matches: false,
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.secret) throw new Error(`Fathom odrzucił żądanie (${res.status}): ${JSON.stringify(body)}`);
console.log(`Webhook ${body.id} utworzony dla ${body.url}`);

const set = spawnSync('npx', ['supabase', 'secrets', 'set', `FATHOM_WEBHOOK_SECRET=${body.secret}`, '--project-ref', PROJECT_REF], {
  stdio: 'inherit',
  shell: true,
});
if (set.status !== 0) throw new Error('Nie udało się ustawić sekretu w Supabase (zalogowany `supabase login`?)');
console.log('Sekret FATHOM_WEBHOOK_SECRET ustawiony. Następne nagranie powinno trafić do closer_calls.');
