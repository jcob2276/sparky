import { afterEach, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { HouseDisclosureDocuments } from './HouseDisclosureDocuments';
import type { HouseDisclosureDocument } from '../../lib/investments/houseDisclosureDocuments';
afterEach(cleanup);
it('exposes an unread scanned document beyond the latest ten and links its official PDF', () => {
  const documents: HouseDisclosureDocument[] = Array.from({ length: 12 }, (_, index) => ({
    id: String(index), filer_name: `Filer ${index}`, filing_date: '2026-09-23',
    source_url: `https://disclosures-clerk.house.gov/${index}.pdf`,
    parse_status: index === 11 ? 'error' : 'parsed', transaction_count: index === 11 ? null : 1,
    parse_error: index === 11 ? 'Skan PDF — wymagany OCR' : null,
  }));
  const { container, getByRole } = render(createElement(HouseDisclosureDocuments, { documents }));
  expect(container.textContent).not.toContain('Filer 11');
  fireEvent.click(getByRole('button', { name: 'Tylko nieodczytane' }));
  expect(container.textContent).toContain('Filer 11');
  expect(container.textContent).toContain('Skan wymaga OCR');
  expect(container.querySelector('a')?.href).toBe('https://disclosures-clerk.house.gov/11.pdf');
});
