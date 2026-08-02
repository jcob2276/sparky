import { describe, expect, it } from 'vitest';
import type { Note } from '../../lib/notesApi';
import {
  DEFAULT_NOTE_COLLECTION_PREFERENCES,
  filterNotesByTags,
  sortAndGroupNotes,
} from '../../lib/noteOrganization';

const note = (id: string, updatedAt: string, patch: Partial<Note> = {}): Note => ({
  id,
  user_id: 'user-1',
  title: id,
  content: '',
  tags: [],
  is_pinned: false,
  is_archived: false,
  color: 'default',
  created_at: updatedAt,
  updated_at: updatedAt,
  deleted_at: null,
  folder_id: null,
  is_locked: false,
  locked_payload: null,
  lock_salt: null,
  lock_iv: null,
  ...patch,
});

describe('sortAndGroupNotes', () => {
  it('assigns Warsaw dates to one Apple Notes-style section', () => {
    const notes = [
      note('month', '2026-06-20T10:00:00Z'),
      note('previous-30', '2026-07-10T10:00:00Z'),
      note('previous-7', '2026-07-27T10:00:00Z'),
      note('yesterday', '2026-07-31T10:00:00Z'),
      note('today', '2026-08-01T08:00:00Z'),
      note('pinned', '2026-05-01T08:00:00Z', { is_pinned: true }),
    ];

    const sections = sortAndGroupNotes(
      notes,
      DEFAULT_NOTE_COLLECTION_PREFERENCES,
      new Date('2026-08-01T12:00:00Z'),
    );

    expect(sections.map(section => section.key)).toEqual([
      'pinned',
      'today',
      'yesterday',
      'previous-7-days',
      'previous-30-days',
      '2026-06',
    ]);
    expect(sections.flatMap(section => section.notes).map(item => item.id)).toHaveLength(notes.length);
  });

  it('sorts Polish titles and uses id as a deterministic tie breaker', () => {
    const notes = [
      note('b', '2026-08-01T08:00:00Z', { title: 'Żaba' }),
      note('a', '2026-08-01T08:00:00Z', { title: 'Żaba' }),
      note('c', '2026-08-01T08:00:00Z', { title: 'Ananas' }),
    ];

    const sections = sortAndGroupNotes(notes, {
      ...DEFAULT_NOTE_COLLECTION_PREFERENCES,
      sortField: 'title',
      direction: 'asc',
      groupByDate: true,
    }, new Date('2026-08-01T12:00:00Z'));

    expect(sections.map(section => section.key)).toEqual(['all']);
    expect(sections[0].notes.map(item => item.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('filterNotesByTags', () => {
  const notes = [
    note('work', '2026-08-01T08:00:00Z', { tags: ['praca'] }),
    note('urgent', '2026-08-01T08:00:00Z', { tags: ['pilne'] }),
    note('both', '2026-08-01T08:00:00Z', { tags: ['praca', 'pilne'] }),
  ];

  it('requires every selected tag in all mode', () => {
    expect(filterNotesByTags(notes, ['praca', 'pilne'], 'all').map(item => item.id)).toEqual(['both']);
  });

  it('accepts any selected tag in any mode', () => {
    expect(filterNotesByTags(notes, ['praca', 'pilne'], 'any').map(item => item.id)).toEqual([
      'work',
      'urgent',
      'both',
    ]);
  });
});
