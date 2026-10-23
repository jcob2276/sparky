import { expect, it, vi } from 'vitest';
import { fetchHouseDisclosureDocuments } from './houseDisclosureDocuments';
import { orcaSelect } from './superinvestorsApi';
import { yearFloor } from './yearFloor';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn().mockResolvedValue([]) }));
it('searches official document metadata by filer and filing date without a ten-document cap', async () => {
  await fetchHouseDisclosureDocuments({ searchQuery: 'Pelosi', timeframe: '90' });
  const path = vi.mocked(orcaSelect).mock.calls.at(-1)?.[0] ?? '';
  expect(path).toContain('filer_name=ilike.*Pelosi*');
  expect(path).toContain('filing_date=gte.');
  expect(path).toContain('parse_error');
  expect(path).not.toContain('limit=10');
});
it('floors the all-year window at 1 January', async () => {
  await fetchHouseDisclosureDocuments({ timeframe: 'ytd' });
  expect(vi.mocked(orcaSelect).mock.calls.at(-1)?.[0]).toContain(`filing_date=gte.${yearFloor()}`);
});
