import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseSec13fCover, parseSec13fRecent, parseSec13fSubmission } from './sec13fData.ts';

const expected = { accession: '0001104659-26-092052', cik: '0001018724', period: '2026-06-30' };
function submission(version = 'X0202', total = '30') {
  return `ACCESSION NUMBER: ${expected.accession}\nCONFORMED SUBMISSION TYPE: 13F-HR\nCENTRAL INDEX KEY: 0001018724
  <edgarSubmission><schemaVersion>${version}</schemaVersion><submissionType>13F-HR</submissionType>
  <periodOfReport>06-30-2026</periodOfReport><tableEntryTotal>2</tableEntryTotal><tableValueTotal>${total}</tableValueTotal></edgarSubmission>
  <informationTable><n:infoTable><n:nameOfIssuer>Issuer &amp; Co</n:nameOfIssuer><n:titleOfClass>COM</n:titleOfClass>
  <n:cusip>023135106</n:cusip><n:value>10</n:value><n:sshPrnamt>5</n:sshPrnamt><n:sshPrnamtType>SH</n:sshPrnamtType></n:infoTable>
  <infoTable><nameOfIssuer>Issuer</nameOfIssuer><titleOfClass>NOTE</titleOfClass><cusip>023135106</cusip><value>20</value>
  <sshPrnamt>1000</sshPrnamt><sshPrnamtType>PRN</sshPrnamtType><putCall>PUT</putCall></infoTable></informationTable>`;
}
Deno.test('SEC 13F preserves security type and reported units', () => {
  const result = parseSec13fSubmission(submission(), expected);
  assertEquals(result.positions[0].issuer_name, 'Issuer & Co');
  assertEquals(result.positions[0].value_usd, 10);
  assertEquals(result.positions[1].quantity_type, 'PRN');
  assertEquals(result.positions[1].put_call, 'PUT');
  assertEquals(parseSec13fSubmission(submission('X0101'), expected).positions[0].value_usd, 10000);
  assertEquals(parseSec13fSubmission(submission().replace('<putCall>PUT', '<putCall>Put'), expected).positions[1].put_call, 'PUT');
});
Deno.test('SEC 13F reads literal CDATA names and normalizes CUSIP letter case', () => {
  const xml = submission().replace('Issuer &amp; Co', '<![CDATA[Issuer &amp; Co]]>')
    .replace('023135106', '48251w104');
  const result = parseSec13fSubmission(xml, expected);
  assertEquals(result.positions[0].issuer_name, 'Issuer &amp; Co');
  assertEquals(result.positions[0].cusip, '48251W104');
});
Deno.test('SEC discovery verifies filer, accession and primary report period', () => {
  const recent = { cik: expected.cik, filings: { recent: { form: ['13F-HR'], accessionNumber: [expected.accession], filingDate: ['2026-08-14'], reportDate: [expected.period] } } };
  assertEquals(parseSec13fRecent(JSON.stringify(recent), expected.cik)[0].accession, expected.accession);
  assertThrows(() => parseSec13fRecent(JSON.stringify(recent), '999'));
  recent.filings.recent.reportDate = [];
  assertThrows(() => parseSec13fRecent(JSON.stringify(recent), expected.cik));
  assertEquals(parseSec13fCover(submission(), expected).period, expected.period);
  assertEquals(parseSec13fCover(submission().replaceAll('13F-HR', '13F-HR/A'), expected).isAmendment, true);
  assertThrows(() => parseSec13fCover(submission().replace('06-30-2026', '02-30-2026'), expected));
});
Deno.test('SEC 13F rejects incomplete, mismatched and ambiguous evidence', () => {
  assertThrows(() => parseSec13fSubmission(submission('X0202', '99'), expected));
  assertThrows(() => parseSec13fSubmission(submission().replace('<tableEntryTotal>2', '<tableEntryTotal>3'), expected));
  assertThrows(() => parseSec13fSubmission(submission(), { ...expected, cik: '0000000001' }));
  assertThrows(() => parseSec13fSubmission(submission('UNKNOWN'), expected));
  assertThrows(() => parseSec13fSubmission(submission().replaceAll('13F-HR', '13F-HR/A'), expected));
});
Deno.test('SEC 13F preserves small summary discrepancies without altering reported rows', () => {
  const result = parseSec13fSubmission(submission('X0202', '31'), expected);
  assertEquals(result.totalValueUsd, 30);
  assertEquals(result.reportedCoverValueUsd, 31);
  assertEquals(result.valueDifferenceUsd, -1);
  assertEquals(result.valueReconciliation, 'rounding_difference');
  assertEquals(result.positions.map(row => row.value_usd), [10, 20]);
  assertThrows(() => parseSec13fSubmission(submission('X0202', '33'), expected));
});

Deno.test('SEC historical XML without schemaVersion uses filing-date units, not report-period units', () => {
  const legacy = submission().replace('<schemaVersion>X0202</schemaVersion>', '');
  const filed = (date: string) => `FILED AS OF DATE: ${date}\n${legacy}`;
  assertEquals(parseSec13fSubmission(filed('20221114'), expected).totalValueUsd, 30000);
  assertEquals(parseSec13fSubmission(filed('20230103'), expected).totalValueUsd, 30);
  assertEquals(parseSec13fSubmission(filed('20230102'), expected).reportedCoverValueUsd, 30000);
  assertThrows(() => parseSec13fSubmission(legacy, expected));
  assertThrows(() => parseSec13fSubmission(filed('20220230'), expected));
  assertThrows(() => parseSec13fSubmission(filed('20221114').replace('<submissionType>', '<schemaVersion>UNKNOWN</schemaVersion><submissionType>'), expected));
});
