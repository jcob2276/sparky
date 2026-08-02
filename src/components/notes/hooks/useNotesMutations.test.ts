import { describe, expect, it } from 'vitest';
import { buildNoteInsertRow } from '@vanguard/domain';
import { getPlainText } from '../keepUtils';
import { NEW_NOTE_DRAFT_CONTENT } from './useNotesMutations';

describe('new note draft', () => {
  it('is persistable but remains visually empty until the user types', () => {
    const row = buildNoteInsertRow({ user_id: 'user-1', title: '', content: NEW_NOTE_DRAFT_CONTENT });
    expect(row.title).toBe('');
    expect(getPlainText(NEW_NOTE_DRAFT_CONTENT)).toBe('');
  });
});
