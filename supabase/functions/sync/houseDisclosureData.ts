export interface HouseDocument {
  docId: string; year: number; name: string; state: string; filingDate: string; sourceUrl: string;
}
export interface PdfTextItem { text: string; x: number; y: number }

export function houseDate(raw: string): string | null {
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!parts) return null;
  const date = `${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : null;
}

function xmlValue(block: string, key: string): string {
  return (new RegExp(`<${key}>([^<]*)</${key}>`).exec(block)?.[1] ?? '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

export function parseHouseIndex(xml: string, year: number): HouseDocument[] {
  if (!xml.includes('<FinancialDisclosure>') || !xml.includes('</FinancialDisclosure>'))
    throw new Error('Niepoprawny indeks dokumentów Izby Reprezentantów');
  const documents: HouseDocument[] = [];
  for (const match of xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)) {
    const block = match[1];
    if (xmlValue(block, 'FilingType') !== 'P') continue;
    const docId = xmlValue(block, 'DocID');
    const filingDate = houseDate(xmlValue(block, 'FilingDate'));
    const name = [xmlValue(block, 'First'), xmlValue(block, 'Last'), xmlValue(block, 'Suffix')].filter(Boolean).join(' ');
    if (!/^\d+$/.test(docId) || !filingDate || !name || Number(xmlValue(block, 'Year')) !== year)
      throw new Error('Niekompletne metadane zgłoszenia STOCK Act');
    documents.push({ docId, year, name, filingDate, state: xmlValue(block, 'StateDst').slice(0, 2),
      sourceUrl: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf` });
  }
  return documents.sort((a, b) => b.filingDate.localeCompare(a.filingDate) || b.docId.localeCompare(a.docId));
}

export function parseHouseTransactionPage(rawItems: PdfTextItem[]) {
  const items = rawItems.map((i) => ({ ...i, text: i.text.replace(/\u0000/g, '').trim() }))
    .filter((i) => i.text);
  const header = (label: string) => items.find((i) => i.text === label);
  const owner = header('Owner'); const asset = header('Asset');
  const type = header('Transaction'); const amount = header('Amount');
  const dates = items.filter((i) => i.text === 'Date' && type && i.x > type.x).sort((a, b) => a.x - b.x);
  if (!owner || !asset || !type || !amount || !dates.length)
    throw new Error('Nie rozpoznano tabeli transakcji w dokumencie House PTR');
  const dateX = dates[0].x;
  const notificationX = dates[1]?.x ?? amount.x;
  const anchors = items.filter((i) => i.x >= dateX - 2 && i.x < notificationX - 2
    && houseDate(i.text) && i.y < type.y - 15).sort((a, b) => b.y - a.y);
  if (!anchors.length) throw new Error('Brak rozpoznanych wierszy transakcji w House PTR');
  return anchors.map((anchor, index) => {
    const nextY = anchors[index + 1]?.y ?? 0;
    const row = items.filter((i) => i.y <= anchor.y + 2 && i.y > nextY + 2)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const column = (start: number, end: number) => row.filter((i) => i.x >= start - 2 && i.x < end - 2);
    const ownerCode = column(owner.x, asset.x).find((i) => i.y >= anchor.y - 15)?.text ?? '';
    const transactionCode = column(type.x, dateX).filter((i) => i.y >= anchor.y - 15).map((i) => i.text).join(' ');
    const transactionType = /^P\b/.test(transactionCode) ? 'buy' : /^S\b/.test(transactionCode) ? 'sell'
      : /^E\b/.test(transactionCode) ? 'exchange' : 'other';
    const assetLines = column(asset.x, type.x);
    const metadataAt = assetLines.findIndex((i) => /^F\s*S\s*:|^D\s*:|^C\s*:/.test(i.text));
    const assetText = assetLines.slice(0, metadataAt < 0 ? undefined : metadataAt).map((i) => i.text).join(' ');
    const amounts = column(amount.x, amount.x + 78).filter((i) => i.y >= anchor.y - 35)
      .map((i) => i.text).join(' ').match(/\$[\d,]+/g)?.map((s) => Number(s.replace(/[$,]/g, ''))) ?? [];
    if (!assetText || !amounts.length) throw new Error('Niepełny wiersz transakcji House PTR');
    const ticker = /\(([A-Z][A-Z0-9.\-]{0,9})\)/.exec(assetText)?.[1] ?? null;
    return { asset: assetText, ticker, owner: ownerCode === 'SP' ? 'spouse' : ownerCode === 'JT' ? 'joint'
      : ownerCode === 'DC' ? 'dependent_child' : ownerCode === '' ? 'self' : 'unknown',
      type: transactionType, transactionDate: houseDate(anchor.text)!,
      notificationDate: houseDate(column(notificationX, amount.x)[0]?.text ?? ''),
      amountLow: amounts[0], amountHigh: amounts[1] ?? null, rawOwner: ownerCode };
  });
}
