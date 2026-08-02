import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import type { Note } from './notesApi';
import { buildNotesArchive, noteAsMarkdown, noteAsText } from './notesExport';

vi.mock('./noteAttachmentsApi', () => ({
  listUserNoteAttachments: vi.fn().mockResolvedValue([]),
  downloadNoteAttachmentFile: vi.fn(),
}));

vi.mock('./noteDrawingsApi', () => ({
  downloadNoteDrawingPreview: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

const note: Note = {
  id: 'note-1',
  user_id: 'user-1',
  title: 'Plan podróży',
  content: '<p>Lot do Gdańska</p>',
  color: 'default',
  is_pinned: false,
  is_archived: false,
  tags: ['wakacje'],
  created_at: '2026-07-23T08:00:00.000Z',
  updated_at: '2026-07-23T09:00:00.000Z',
  deleted_at: null,
  folder_id: null,
  is_locked: false,
  locked_payload: null,
  lock_salt: null,
  lock_iv: null,
};

describe('notes export', () => {
  it('creates readable text without HTML markup', () => {
    expect(noteAsText(note)).toContain('Lot do Gdańska');
    expect(noteAsText(note)).not.toContain('<p>');
  });

  it('creates a ZIP with a manifest and note text', async () => {
    const blob = await buildNotesArchive('user-1', [note], []);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(zip.file('manifest.json')).not.toBeNull();
    const noteFile = Object.keys(zip.files).find(path => path.startsWith('notes/') && path.endsWith('.md'));
    expect(noteFile).toBeTruthy();
    await expect(zip.file(noteFile!)!.async('string')).resolves.toContain('Plan podróży');
  });

  it('embeds a drawing preview beside the Markdown note in an archive', async () => {
    const blob = await buildNotesArchive('user-1', [{ ...note, drawing_preview_path: 'user-1/note-1/drawing-preview.png' }], []);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const noteFile = Object.keys(zip.files).find(path => path.startsWith('notes/') && path.endsWith('.md'))!;
    const markdown = await zip.file(noteFile)!.async('string');

    expect(markdown).toContain('![Rysunek](../drawings/note-1.png)');
    expect(zip.file('drawings/note-1.png')).not.toBeNull();
  });

  it('creates Markdown metadata and readable content', () => {
    const markdown = noteAsMarkdown(note, 'Podróże');
    expect(markdown).toContain('# Plan podróży');
    expect(markdown).toContain('**Folder:** Podróże');
    expect(markdown).toContain('**Tagi:** #wakacje');
    expect(markdown).toContain('Lot do Gdańska');
    expect(markdown).not.toContain('<p>');
  });
});
