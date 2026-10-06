export interface KnfRecord {
  HOLDER_FULL_NAME: string; ISSUER_NAME: string; ISIN: string;
  POSITION_DATE: string; MODIFY_DATE?: string; NET_SHORT_POSITION_O: string;
}

function decoded(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    const names: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (names[entity.toLowerCase()]) return names[entity.toLowerCase()];
    const code = entity.startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }).trim();
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export async function normalizeKnfRecord(record: KnfRecord, tickers: Map<string, string>) {
  if (!record || typeof record.HOLDER_FULL_NAME !== 'string' || typeof record.ISSUER_NAME !== 'string'
    || typeof record.ISIN !== 'string' || !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(record.ISIN)
    || !validDate(record.POSITION_DATE) || (record.MODIFY_DATE != null && !validDate(record.MODIFY_DATE)))
    throw new Error('Niepoprawna tożsamość lub data wpisu KNF');
  const raw = String(record.NET_SHORT_POSITION_O).trim();
  if (!/^\d+(?:[.,]\d*)?$/.test(raw)) throw new Error(`Niepoprawna pozycja KNF: ${raw}`);
  const pct = Number(raw.replace(',', '.'));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error('Pozycja KNF poza zakresem');
  const holder = decoded(record.HOLDER_FULL_NAME);
  const company = decoded(record.ISSUER_NAME);
  if (!holder || !company) throw new Error('Brak nazwy w rejestrze KNF');
  const modifyDate = record.MODIFY_DATE ?? null;
  const identity = JSON.stringify([holder, record.ISIN, record.POSITION_DATE, pct, modifyDate]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const externalId = 'knf:' + Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { external_id: externalId, holder, company, isin: record.ISIN,
    ticker: tickers.get(record.ISIN) ?? null, position_pct: pct, position_pct_raw: raw,
    below_public_threshold: pct < 0.5, position_date: record.POSITION_DATE, modify_date: modifyDate,
    source_url: 'https://rss.knf.gov.pl/rss_pub/', source_system: 'knf_rss_official' };
}

export async function fetchKnfRecords(method: 'Default' | 'RssHTable'): Promise<KnfRecord[]> {
  const rows: KnfRecord[] = [];
  let expected: number | null = null;
  while (expected == null || rows.length < expected) {
    const response = await fetch('https://rss.knf.gov.pl/rss_pub/JSON', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest', Referer: 'https://rss.knf.gov.pl/rss_pub/' },
      body: 'request=' + encodeURIComponent(JSON.stringify({ cmd: 'get', language: 'pl', search: [],
        limit: 1000, offset: rows.length, method, sort: [{ field: 'POSITION_DATE', direction: 'desc' }],
        searchLogic: 'AND', searchValue: '' })), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`KNF ${method}: HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== 'success' || !Number.isInteger(data.total) || data.total < 0 || data.total > 100000
      || !Array.isArray(data.records) || (expected != null && expected !== data.total))
      throw new Error('Niepełna lub zmieniona odpowiedź rejestru KNF');
    expected = data.total;
    if ((!data.records.length && rows.length < expected!) || rows.length + data.records.length > expected!)
      throw new Error('Niepełna paginacja rejestru KNF');
    rows.push(...data.records);
    if (expected === 0) break;
  }
  return rows;
}
