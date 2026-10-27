import { expect, it } from 'vitest';
import { readAuditRows } from '../../../supabase/functions/food-integrity-audit/readRows';

it('audits every page and fails closed when a later page cannot be read', async () => {
  const rows = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const read = (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  expect(await readAuditRows(read, 'entries')).toHaveLength(1203);
  await expect(readAuditRows((from, to) => from ? Promise.resolve({ data: null, error: { message: 'offline' } }) : read(from, to), 'entries')).rejects.toThrow('offline');
});
