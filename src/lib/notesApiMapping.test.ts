import { describe, expect, it } from 'vitest';
import { mapNoteRows } from './notesApi';

describe('mapNoteRows', () => {
  it('adds OCR and audio transcripts to searchable attachment text', () => {
    const [note] = mapNoteRows([{
      id: 'n1', user_id: 'u1', title: 'Spotkanie', content: '', tags: [],
      is_pinned: false, is_archived: false, color: 'default', created_at: '', updated_at: '',
      deleted_at: null, folder_id: null, is_locked: false, locked_payload: null,
      lock_salt: null, lock_iv: null,
      note_attachments: [{ file_name: 'rozmowa.m4a', ocr_text: 'faktura', transcript: 'ustaliliśmy termin' }],
      note_drawings: [{ ocr_text: 'odręczna umowa' }],
    }]);

    expect(note.attachment_text).toBe('faktura ustaliliśmy termin odręczna umowa');
  });

  it('maps the one-to-one drawing relation returned as an object', () => {
    const [mapped] = mapNoteRows([{
      id: 'n1', user_id: 'u1', title: '', content: '<p><br></p>', tags: [],
      is_pinned: false, is_archived: false, color: 'default', created_at: '', updated_at: '',
      deleted_at: null, folder_id: null, is_locked: false, locked_payload: null,
      lock_salt: null, lock_iv: null,
      note_attachments: [],
      note_drawings: { ocr_text: 'odręczne hasło', preview_storage_path: 'u1/n1/drawing-preview.png' },
    }]);

    expect(mapped.attachment_text).toContain('odręczne hasło');
    expect(mapped.drawing_preview_path).toBe('u1/n1/drawing-preview.png');
  });

  it('does not expose attachment text from a locked note', () => {
    const [note] = mapNoteRows([{
      id: 'n1', user_id: 'u1', title: 'Sekret', content: '', tags: [],
      is_pinned: false, is_archived: false, color: 'default', created_at: '', updated_at: '',
      deleted_at: null, folder_id: null, is_locked: true, locked_payload: 'x',
      lock_salt: 'x', lock_iv: 'x',
      note_attachments: [{ file_name: 'secret.m4a', ocr_text: null, transcript: 'tajna rozmowa' }],
      note_drawings: [{ ocr_text: 'sekret na rysunku' }],
    }]);

    expect(note.attachment_text).toBe('');
    expect(note.attachment_names).toEqual([]);
  });
});
