export interface Sec13fExpected { accession: string; cik: string; period: string; isAmendment?: boolean }
function blocks(xml: string, tag: string): string[] {
  const prefix = '(?:[\\w-]+:)?';
  return [...xml.matchAll(new RegExp(`<${prefix}${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${prefix}${tag}>`, 'g'))].map(match => match[1]);
}
function literal(xml: string, tag: string): string | null {
  const value = blocks(xml, tag)[0]?.trim();
  if (value?.startsWith('<![CDATA[') && value.endsWith(']]>')) {
    const literalValue = value.slice(9, -3);
    return literalValue.includes(']]>') ? null : literalValue.trim() || null;
  }
  if (value == null || /<[^>]+>/.test(value)) return null;
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code))) || null;
}
function numeric(xml: string, tag: string): number {
  const raw = literal(xml, tag);
  if (raw == null || !/^\d+(\.\d+)?$/.test(raw)) throw new Error(`SEC 13F missing numeric ${tag}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) throw new Error(`SEC 13F invalid ${tag}`);
  return value;
}

export function parseSec13fCover(input: string, expected: { accession: string; cik: string }) {
  if (input.length > 20_000_000 || /<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error('Unsupported SEC 13F document');
  const accession = input.match(/ACCESSION NUMBER:\s*(\d{10}-\d{2}-\d{6})/)?.[1];
  const cik = input.match(/CENTRAL INDEX KEY:\s*(\d+)/)?.[1];
  const cover = blocks(input, 'edgarSubmission')[0];
  if (!cover || accession !== expected.accession || Number(cik) !== Number(expected.cik)
    || !['13F-HR', '13F-HR/A'].includes(literal(cover, 'submissionType') ?? '')) throw new Error('SEC 13F filing identity mismatch');
  const period = literal(cover, 'periodOfReport');
  const parts = period?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!parts) throw new Error('SEC 13F report period missing');
  const reportPeriod = `${parts[3]}-${parts[1]}-${parts[2]}`;
  if (new Date(`${reportPeriod}T00:00:00Z`).toISOString().slice(0, 10) !== reportPeriod) throw new Error('SEC 13F report period invalid');
  const schema = literal(cover, 'schemaVersion');
  let multiplier = schema?.startsWith('X02') ? 1 : schema?.startsWith('X01') ? 1000 : null;
  // SEC changed values from thousands to dollars on 2023-01-03. Older XML
  // omits schemaVersion; use the submission's filing date, never its report period.
  // https://content.govdelivery.com/accounts/USSEC/bulletins/3401c41
  if (blocks(cover, 'schemaVersion').length === 0) {
    const filed = [...input.matchAll(/^FILED AS OF DATE:\s*(\d{8})\s*$/gm)];
    const stamp = filed.length === 1 ? filed[0][1] : null;
    const filingDate = stamp ? `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6)}` : null;
    if (filingDate && new Date(`${filingDate}T00:00:00Z`).toISOString().slice(0, 10) === filingDate) {
      multiplier = filingDate < '2023-01-03' ? 1000 : 1;
    }
  }
  if (multiplier == null) throw new Error('Unknown SEC 13F value units');
  return { cover, period: reportPeriod, isAmendment: literal(cover, 'submissionType') === '13F-HR/A', multiplier, schema };
}

export function parseSec13fSubmission(input: string, expected: Sec13fExpected) {
  const { cover, period, isAmendment, multiplier, schema } = parseSec13fCover(input, expected);
  if (expected.isAmendment !== undefined && expected.isAmendment !== isAmendment)
    throw new Error('SEC 13F amendment identity mismatch');
  let amendmentType: 'ORIGINAL' | 'RESTATEMENT' | 'NEW HOLDINGS' = 'ORIGINAL';
  let amendmentNumber: number | null = null;
  if (isAmendment) {
    const kind = literal(cover, 'amendmentType');
    const number = numeric(cover, 'amendmentNo');
    if (!['RESTATEMENT', 'NEW HOLDINGS'].includes(kind ?? '') || !Number.isSafeInteger(number) || number < 1
      || literal(cover, 'isAmendment') !== 'true') throw new Error('SEC 13F amendment metadata invalid');
    amendmentType = kind as 'RESTATEMENT' | 'NEW HOLDINGS';
    amendmentNumber = number;
  } else if (literal(cover, 'isAmendment') === 'true') throw new Error('SEC 13F amendment identity mismatch');
  if (period !== expected.period) throw new Error('SEC 13F report period mismatch');
  const table = blocks(input, 'informationTable')[0];
  if (table == null) throw new Error('SEC 13F information table missing');
  const positions = blocks(table, 'infoTable').map((row, row_index) => {
    const cusip = literal(row, 'cusip')?.toUpperCase(); const quantity_type = literal(row, 'sshPrnamtType');
    const issuer_name = literal(row, 'nameOfIssuer'); const title_of_class = literal(row, 'titleOfClass');
    const put_call = literal(row, 'putCall')?.toUpperCase() ?? null;
    if (!cusip || !/^[A-Z0-9*@#]{9}$/.test(cusip) || !issuer_name || !title_of_class
      || !['SH', 'PRN'].includes(quantity_type ?? '') || (put_call && !['PUT', 'CALL'].includes(put_call)))
      throw new Error('Invalid SEC 13F security');
    return { row_index, cusip, issuer_name, title_of_class, quantity_type, put_call,
      quantity: numeric(row, 'sshPrnamt'), value_usd: numeric(row, 'value') * multiplier };
  });
  const entryCount = numeric(cover, 'tableEntryTotal');
  const reportedCoverValueUsd = numeric(cover, 'tableValueTotal') * multiplier;
  const totalValueUsd = positions.reduce((sum, row) => sum + row.value_usd, 0);
  const valueDifferenceUsd = totalValueUsd - reportedCoverValueUsd;
  // SEC rounds each row and the aggregate separately. Keep both; do not force agreement.
  const roundingBoundUsd = (entryCount + 1) * multiplier / 2;
  if (!Number.isInteger(entryCount) || positions.length !== entryCount || !Number.isSafeInteger(totalValueUsd)
    || Math.abs(valueDifferenceUsd) > roundingBoundUsd)
    throw new Error('Incomplete SEC 13F information table');
  return { positions, entryCount, totalValueUsd, reportedCoverValueUsd, valueDifferenceUsd, amendmentType, amendmentNumber,
    valueReconciliation: valueDifferenceUsd === 0 ? 'exact' : 'rounding_difference', valueUnitUsd: multiplier, schemaVersion: schema };
}

export function parseSec13fRecent(input: string, expectedCik: string) {
  const data = JSON.parse(input);
  if (Number(data.cik) !== Number(expectedCik)) throw new Error('SEC submissions filer mismatch');
  const recent = data.filings?.recent;
  const fields = ['form', 'accessionNumber', 'filingDate', 'reportDate'];
  if (!recent || fields.some(key => !Array.isArray(recent[key]) || recent[key].length !== recent.form?.length)) throw new Error('SEC submissions columns incomplete');
  return recent.form.flatMap((form: string, index: number) => {
    if (!['13F-HR', '13F-HR/A'].includes(form)) return [];
    const accession = recent.accessionNumber[index];
    const filingDate = recent.filingDate[index]; const period = recent.reportDate[index];
    if (!/^\d{10}-\d{2}-\d{6}$/.test(accession)
      || [filingDate, period].some(value => typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) throw new Error('SEC submissions 13F identity invalid');
    return [{ accession, filingDate, period, isAmendment: form === '13F-HR/A' }];
  }) as Array<{ accession: string; filingDate: string; period: string; isAmendment: boolean }>;
}
