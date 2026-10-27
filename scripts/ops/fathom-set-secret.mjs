#!/usr/bin/env node
/**
 * Ustawia FATHOM_WEBHOOK_SECRET w Supabase z tego, co jest w schowku (skopiowane przyciskiem w Fathom:
 * Settings -> API Access -> sparky -> Webhook Secret). Sekret nie jest wypisywany.
 */
import { execFileSync, spawnSync } from 'node:child_process';

const PROJECT_REF = 'pdvqkgfsqziqlhptatgf';
const secret = execFileSync('powershell', ['-NoProfile', '-Command', 'Get-Clipboard'], { encoding: 'utf8' }).trim();
if (!/^whsec_[A-Za-z0-9+/=_-]+$/.test(secret)) {
  throw new Error('Schowek nie zawiera sekretu whsec_… Skopiuj go przyciskiem obok „Webhook Secret” w Fathom i uruchom ponownie.');
}
const set = spawnSync('npx', ['supabase', 'secrets', 'set', `FATHOM_WEBHOOK_SECRET=${secret}`, '--project-ref', PROJECT_REF], {
  stdio: 'inherit',
  shell: true,
});
if (set.status !== 0) throw new Error('Nie udało się ustawić sekretu (zalogowany `npx supabase login`?)');
console.log('Gotowe: FATHOM_WEBHOOK_SECRET ustawiony.');
