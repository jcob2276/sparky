import type { LibraryItem } from '../../../lib/learning/shelfModel';

/** Atrapa pozycji biblioteki do testów komponentów półki. */
export const makeItem = (patch: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'i1',
  user_id: 'u1',
  title: 'Dune',
  author: 'Frank Herbert',
  resource_type: 'book',
  pages: 612,
  finished_on: '2019-05-01',
  finished_year: null,
  rating: null,
  source: 'manual',
  assignment_id: null,
  created_at: '2019-06-01T10:00:00Z',
  ...patch,
});
