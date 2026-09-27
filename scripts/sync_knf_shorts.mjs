import { chromium } from 'playwright';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SB_SECRET_KEY;

export async function syncKnfShortsDirect() {
  console.log('[KNF Sync] Launching headless browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  try {
    console.log('[KNF Sync] Loading https://rss.knf.gov.pl/ ...');
    await page.goto('https://rss.knf.gov.pl/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#maintable tbody tr', { timeout: 15000 });

    const rawRows = await page.$$eval('#maintable tbody tr', trs => {
      return trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()));
    });

    console.log(`[KNF Sync] Found ${rawRows.length} active short positions from KNF.`);
    if (rawRows.length === 0) return { count: 0, status: 'no_rows' };

    // Fetch existing companies to resolve tickers
    const compRes = await fetch(`${SUPABASE_URL}/rest/v1/gpw_companies?select=isin,ticker,name`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    const companies = compRes.ok ? await compRes.json() : [];
    const isinToTicker = new Map(companies.filter(c => c.isin && c.ticker).map(c => [c.isin, c.ticker]));

    // Known common GPW tickers fallback
    const KNOWN_TICKERS = {
      PLOPTTC00011: 'CDR',
      PL11B0000014: '11B',
      PLTENSR00018: 'TSG',
      PLDNP0000013: 'DNP',
      PLBIG0000016: 'MIL',
      PLALR0000011: 'ALR',
      PLPEKAO00016: 'PEO',
      PLPKN0000018: 'PKN',
      PLBZ00000044: 'SPL',
    };

    const payload = rawRows.map((r, idx) => {
      const holder = r[1] || 'Nieznany Fundusz';
      const company = r[2] || 'Spółka GPW';
      const isin = r[3] || '';
      const pct = parseFloat(r[4].replace(',', '.')) || 0;
      const positionDate = r[5] || new Date().toISOString().slice(0, 10);
      const modifyDate = r[6] || positionDate;
      const ticker = isinToTicker.get(isin) || KNOWN_TICKERS[isin] || company.split(' ')[0].toUpperCase();

      return {
        id: Date.now() + idx,
        holder,
        company,
        isin,
        ticker,
        position_pct: pct,
        position_pct_raw: r[4] || `${pct}%`,
        below_public_threshold: false,
        position_date: positionDate,
        modify_date: modifyDate,
        source_url: 'https://rss.knf.gov.pl/',
        source_system: 'knf_rss_official',
      };
    });

    console.log(`[KNF Sync] Upserting ${payload.length} rows into Supabase gpw_short_positions...`);
    const upRes = await fetch(`${SUPABASE_URL}/rest/v1/gpw_short_positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (!upRes.ok) {
      const err = await upRes.text();
      console.error('[KNF Sync] Upsert error:', err);
    } else {
      console.log('[KNF Sync] Successfully synchronized KNF shorts to Supabase!');
    }

    return { ok: true, count: payload.length };
  } catch (err) {
    console.error('[KNF Sync] Error:', err.message);
    return { ok: false, error: err.message };
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('sync_knf_shorts.mjs')) {
  syncKnfShortsDirect();
}
