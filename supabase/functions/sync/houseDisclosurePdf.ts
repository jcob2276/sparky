import * as pdfjs from 'npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs';
import { parseHouseTransactionPage, type PdfTextItem } from './houseDisclosureData.ts';

/** Decode the official table coordinates; never infer transactions with an LLM. */
export async function readHousePdf(sourceUrl: string) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`House PTR PDF: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 10_000_000) throw new Error('Zbyt duży dokument House PTR');
  const document = await pdfjs.getDocument({ data: bytes, isEvalSupported: false,
    useSystemFonts: false, disableFontFace: true, useWorkerFetch: false }).promise;
  try {
    if (document.numPages > 30) throw new Error('House PTR przekracza limit stron');
    const rows: ReturnType<typeof parseHouseTransactionPage> = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = content.items.flatMap((item) => 'str' in item
        ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }] : []);
      // Signature-only pages are not transaction tables.
      if (!items.some((item) => item.text === 'Asset') && i > 1) continue;
      rows.push(...parseHouseTransactionPage(items));
      page.cleanup();
    }
    if (!rows.length) throw new Error('Nie odczytano transakcji z House PTR');
    return rows;
  } finally { await document.destroy(); }
}
