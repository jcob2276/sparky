/** SEC ownership XML has no external entity expansion; only reported literal values are read. */
function blocks(xml: string, tag: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'g')), m => m[1]);
}
function text(xml: string, tag: string): string | null {
  const body = blocks(xml, tag)[0];
  if (body == null) return null;
  const value = body.replace(/<[^>]+>/g, '').trim().replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return value || null;
}
function numeric(xml: string, tag: string): number | null {
  const value = text(blocks(xml, tag)[0] ?? '', 'value');
  if (value == null || !/^-?\d+(\.\d+)?$/.test(value)) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
function date(xml: string, tag: string): string | null {
  const value = text(blocks(xml, tag)[0] ?? '', 'value');
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
export interface SecFiling { accession: string; filing_date: string; doc_url: string }
export interface DiscoveredFiling { accession: string; filing_date: string; submission_url: string; form_type: string }
export function parseOwnership(xml: string, filing: SecFiling): Record<string, unknown>[] {
  if (!blocks(xml, 'ownershipDocument').length) throw new Error('No SEC ownershipDocument');
  const form = text(xml, 'documentType');
  if (form !== '4' && form !== '4/A') throw new Error('Not SEC Form 4');
  const issuer = blocks(xml, 'issuer')[0] ?? '';
  const owners = blocks(xml, 'reportingOwner').map(owner => ({
    cik: text(owner, 'rptOwnerCik'), name: text(owner, 'rptOwnerName'), title: text(owner, 'officerTitle'),
    director: text(owner, 'isDirector') === '1', officer: text(owner, 'isOfficer') === '1',
    tenPercent: text(owner, 'isTenPercentOwner') === '1', other: text(owner, 'otherText'),
  }));
  if (!owners.length || owners.some(o => !o.name)) throw new Error('Reporting owner missing');
  const rows: Record<string, unknown>[] = [];
  for (const [tag, derivative] of [['nonDerivativeTransaction', false], ['derivativeTransaction', true]] as const) {
    for (const [index, row] of blocks(xml, tag).entries()) {
      const shares = numeric(row, 'transactionShares'); const price = numeric(row, 'transactionPricePerShare');
      const code = text(row, 'transactionCode');
      const txDate = date(row, 'transactionDate');
      rows.push({
        id: `sec:${filing.accession}:${derivative ? 'd' : 'n'}:${index}`, source_id: 'sec_form4', branch: 'executive',
        accession: filing.accession, form_type: form, issuer_cik: text(issuer, 'issuerCik'),
        filer_id: owners.map(o => o.cik).filter(Boolean).join(';') || null, filer_name: owners.map(o => o.name).join('; '),
        insider_title: owners.map(o => o.title || (o.director ? 'Director' : o.tenPercent ? '10% owner' : o.other)).filter(Boolean).join('; ') || null,
        reporting_owners: owners, ticker: text(issuer, 'issuerTradingSymbol')?.toUpperCase() ?? null,
        asset_name: text(issuer, 'issuerName'), asset_type: derivative ? 'derivative' : 'stock',
        security_title: text(row, 'securityTitle'), transaction_code: code,
        transaction_type: code === 'P' ? 'Purchase' : code === 'S' ? 'Sale' : code ?? 'Unknown',
        transaction_date: txDate, filing_date: filing.filing_date, doc_url: filing.doc_url,
        shares, price_usd: price, value_usd: shares != null && price != null ? shares * price : null,
        acquired_disposed: text(row, 'transactionAcquiredDisposedCode'), is_derivative: derivative,
        ownership_nature: text(row, 'directOrIndirectOwnership'), shares_after: numeric(row, 'sharesOwnedFollowingTransaction'),
        days_to_file: txDate ? Math.round((Date.parse(filing.filing_date) - Date.parse(txDate)) / 86400000) : null,
        raw_data: { transaction_xml: row, footnotes_xml: blocks(xml, 'footnotes')[0] ?? null },
      });
    }
  }
  return rows;
}
export function parseMasterIndex(input: string): DiscoveredFiling[] {
  const rows = new Map<string, DiscoveredFiling>();
  for (const line of input.split(/\r?\n/)) {
    const [, , form, filed, path] = line.split('|');
    if (!['4', '4/A'].includes(form) || !/^\d{4}-\d{2}-\d{2}$/.test(filed ?? '')) continue;
    const accession = path?.match(/(\d{10}-\d{2}-\d{6})\.txt$/)?.[1];
    if (!accession || !/^edgar\/data\/\d+\//.test(path)) continue;
    rows.set(accession, { accession, filing_date: filed, form_type: form, submission_url: `https://www.sec.gov/Archives/${path}` });
  }
  return [...rows.values()];
}
export function parseCurrentFeed(xml: string): DiscoveredFiling[] {
  const rows: DiscoveredFiling[] = [];
  for (const entry of blocks(xml, 'entry')) {
    const link = entry.match(/href="(https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d+\/\d{10}-\d{2}-\d{6}-index\.htm[l]?)"/)?.[1];
    const accession = link?.match(/(\d{10}-\d{2}-\d{6})-index/)?.[1];
    const form = entry.match(/term="(4(?:\/A)?)"/)?.[1];
    const filed = text(entry, 'updated')?.slice(0, 10);
    if (link && accession && form && filed) rows.push({ accession, filing_date: filed, form_type: form, submission_url: link.replace(/-index\.html?$/, '.txt') });
  }
  return rows;
}
