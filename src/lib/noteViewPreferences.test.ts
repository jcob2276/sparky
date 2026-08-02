import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTE_COLLECTION_PREFERENCES,
} from './noteOrganization';
import {
  getCollectionPreferenceKey,
  parseNoteViewPreferences,
} from './noteViewPreferences';

describe('noteViewPreferences', () => {
  it('falls back when stored values are malformed', () => {
    expect(parseNoteViewPreferences({ sortField: 'broken' })).toEqual(
      DEFAULT_NOTE_COLLECTION_PREFERENCES,
    );
    expect(parseNoteViewPreferences(null)).toEqual(DEFAULT_NOTE_COLLECTION_PREFERENCES);
  });

  it('accepts a complete preference object', () => {
    expect(parseNoteViewPreferences({
      view: 'gallery',
      sortField: 'created_at',
      direction: 'asc',
      groupByDate: false,
    })).toEqual({
      view: 'gallery',
      sortField: 'created_at',
      direction: 'asc',
      groupByDate: false,
    });
  });

  it('uses stable keys for all notes and folders', () => {
    expect(getCollectionPreferenceKey(null)).toBe('all');
    expect(getCollectionPreferenceKey('folder-1')).toBe('folder:folder-1');
  });
});
