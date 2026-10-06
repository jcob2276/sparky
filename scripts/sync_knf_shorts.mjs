import { pathToFileURL } from 'node:url';

/** CLI compatibility wrapper: the server owns parsing and all database writes. */
export async function syncKnfShortsDirect({ env = process.env, fetchImpl = fetch } = {}) {
  const baseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SB_SECRET_KEY;
  if (!baseUrl || !serviceKey) throw new Error('Missing Supabase service-role configuration');
  const url = new URL('/functions/v1/sync', baseUrl);
  if (url.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS');
  url.searchParams.set('service', 'knf_shorts');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`KNF import failed (HTTP ${response.status})`);
  const result = await response.json();
  if (result?.ok !== true) throw new Error('KNF importer did not confirm success');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    try { process.loadEnvFile('.env'); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const result = await syncKnfShortsDirect();
    console.log('[KNF] Official snapshot imported:', JSON.stringify(result));
  } catch (error) {
    console.error('[KNF]', error.message);
    process.exitCode = 1;
  }
}
