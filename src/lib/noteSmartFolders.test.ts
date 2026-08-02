import { describe, expect, it } from 'vitest';
import type { Note } from './notesApi';
import {
  matchesSmartFolder,
  parseSmartFolderRule,
  type SmartFolderRuleV1,
} from './noteSmartFolders';

const note: Note = {
  id: 'n1', user_id: 'u1', title: 'Oferta', content: '', tags: ['pilne', 'praca'],
  is_pinned: false, is_archived: false, color: 'default', created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-07-30T10:00:00Z', deleted_at: null, folder_id: 'child', is_locked: false,
  locked_payload: null, lock_salt: null, lock_iv: null, attachment_names: ['oferta.pdf'],
};

describe('noteSmartFolders', () => {
  const rule: SmartFolderRuleV1 = {
    version: 1,
    tags: ['pilne', 'praca'],
    tagMode: 'all',
    folderId: 'root',
    includeDescendants: true,
    hasAttachments: true,
    isLocked: false,
    updatedWithinDays: 7,
  };

  it('matches all supported predicates together', () => {
    expect(matchesSmartFolder(note, rule, new Set(['child']), new Date('2026-08-01T12:00:00Z'))).toBe(true);
    expect(matchesSmartFolder({ ...note, tags: ['pilne'] }, rule, new Set(['child']), new Date('2026-08-01T12:00:00Z'))).toBe(false);
  });

  it('rejects unsupported or malformed rule versions', () => {
    expect(() => parseSmartFolderRule({ version: 2 })).toThrow('Nieobsługiwana wersja Smart Folderu.');
    expect(() => parseSmartFolderRule({ version: 1, tags: 'pilne' })).toThrow('Uszkodzona reguła Smart Folderu.');
  });
});
