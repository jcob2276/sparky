import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
});

it('recovers application files without deleting user drafts, settings or session data', async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.setItem('vanguard_note_draft:note-1', 'unsaved note');
  localStorage.setItem('vanguard_powerlist_draft_owner_day', 'unsaved plan');
  localStorage.setItem('sb-auth-token', 'session');
  sessionStorage.setItem('pending-form', 'unsaved form');
  const unregister = vi.fn().mockResolvedValue(true);
  const caches = { keys: vi.fn().mockResolvedValue(['workbox-app']), delete: vi.fn().mockResolvedValue(true) };
  const browser = { location: { hostname: 'sparky.test', reload: vi.fn() }, addEventListener: vi.fn(), caches };
  const source = readFileSync('index.html', 'utf8');
  const bootstrap = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(bootstrap).toBeTruthy();
  runInNewContext(bootstrap!, {
    window: browser, document, localStorage, sessionStorage, caches, setTimeout,
    navigator: { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) } },
  });
  const onError = browser.addEventListener.mock.calls.find(([name]) => name === 'error')?.[1];
  onError({ message: 'Bundle unavailable' });
  await vi.runAllTimersAsync();
  document.getElementById('btn-hard-reload')!.click();
  await vi.waitFor(() => expect(browser.location.reload).toHaveBeenCalled());
  expect(unregister).toHaveBeenCalled();
  expect(caches.delete).toHaveBeenCalledWith('workbox-app');
  expect(localStorage.getItem('vanguard_note_draft:note-1')).toBe('unsaved note');
  expect(localStorage.getItem('vanguard_powerlist_draft_owner_day')).toBe('unsaved plan');
  expect(localStorage.getItem('sb-auth-token')).toBe('session');
  expect(sessionStorage.getItem('pending-form')).toBe('unsaved form');
});
