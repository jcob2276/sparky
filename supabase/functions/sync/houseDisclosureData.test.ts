import { parseHouseIndex, parseHouseTransactionPage } from './houseDisclosureData.ts';

Deno.test('House index preserves filing date separately from transaction date', () => {
  const docs = parseHouseIndex('<FinancialDisclosure><Member><First>Nancy</First><Last>Pelosi</Last>'
    + '<FilingType>P</FilingType><StateDst>CA11</StateDst><Year>2026</Year>'
    + '<FilingDate>10/2/2026</FilingDate><DocID>20035553</DocID></Member></FinancialDisclosure>', 2026);
  if (docs[0]?.filingDate !== '2026-10-02' || docs[0]?.name !== 'Nancy Pelosi'
    || !docs[0]?.sourceUrl.endsWith('/2026/20035553.pdf')) throw new Error('Lost official document provenance');
});

const item = (text: string, x: number, y: number) => ({ text, x, y });
const headers = [item('Owner', 65, 503), item('Asset', 104, 503), item('Transaction', 260, 503),
  item('Date', 324, 503), item('Notification', 380, 503), item('Date', 380, 492), item('Amount', 445, 503)];

Deno.test('House PDF keeps spouse, nonlisted asset and disclosed amount range', () => {
  const rows = parseHouseTransactionPage([...headers,
    item('SP', 65, 459), item('REOF XXX, LLC [AB]', 104, 459), item('P', 260, 459),
    item('09/08/2026', 324, 459), item('09/08/2026', 380, 459),
    item('$500,001 -', 445, 459), item('$1,000,000', 445, 448),
    item('F\u0000\u0000 S\u0000\u0000: New', 104, 431), item('D: Investment in LLC', 104, 418),
  ]);
  if (rows.length !== 1 || rows[0].ticker !== null || rows[0].owner !== 'spouse'
    || rows[0].transactionDate !== '2026-09-08' || rows[0].amountLow !== 500001
    || rows[0].amountHigh !== 1000000 || rows[0].type !== 'buy'
    || rows[0].asset !== 'REOF XXX, LLC [AB]') throw new Error('Misclassified Pelosi spouse real estate disclosure');
});

Deno.test('House PDF separates wrapped stock rows and does not guess unknown types', () => {
  const rows = parseHouseTransactionPage([...headers,
    item('JT', 65, 459), item('Microsoft Corporation', 104, 459), item('(MSFT) [ST]', 104, 448),
    item('S (partial)', 260, 459), item('09/01/2026', 324, 459),
    item('$15,001 -', 445, 459), item('$50,000', 445, 448),
    item('SP', 65, 400), item('Amazon (AMZN) [ST]', 104, 400), item('E', 260, 400),
    item('09/02/2026', 324, 400), item('$1,001 - $15,000', 445, 400),
  ]);
  if (rows.length !== 2 || rows[0].ticker !== 'MSFT' || rows[0].type !== 'sell'
    || rows[1].type !== 'exchange' || rows[1].ticker !== 'AMZN') throw new Error('Merged or relabeled PDF transactions');
});

Deno.test('House source format failure is visible rather than a successful empty import', () => {
  let failed = false;
  try { parseHouseTransactionPage([item('Scanned document with no recognized transaction table', 20, 700)]); }
  catch { failed = true; }
  if (!failed) throw new Error('An unreadable disclosure was marked parsed');
});
