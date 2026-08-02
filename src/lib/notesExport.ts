import JSZip from 'jszip';
import type { NoteFolder } from './noteFoldersApi';
import type { Note } from './notesApi';
import { downloadNoteAttachmentFile, listUserNoteAttachments } from './noteAttachmentsApi';
import { getPlainText } from './noteText';
import { getTodayWarsaw } from './date';
import { downloadNoteDrawingPreview } from './noteDrawingsApi';

const safeName = (value: string) => (
  value.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'notatka'
);

export const noteAsText = (note: Note, folderName?: string): string => [
  note.title || 'Bez tytułu',
  '',
  folderName ? `Folder: ${folderName}` : null,
  note.tags.length ? `Tagi: ${note.tags.join(', ')}` : null,
  `Utworzono: ${note.created_at}`,
  `Zmieniono: ${note.updated_at}`,
  '',
  getPlainText(note.content),
].filter(line => line !== null).join('\n');

export const noteAsMarkdown = (note: Note, folderName?: string, drawingPath?: string): string => [
  `# ${note.title || 'Bez tytułu'}`,
  '',
  folderName ? `**Folder:** ${folderName}` : null,
  note.tags.length ? `**Tagi:** ${note.tags.map(tag => `#${tag}`).join(' ')}` : null,
  `**Utworzono:** ${note.created_at}`,
  `**Zmieniono:** ${note.updated_at}`,
  '',
  getPlainText(note.content),
  drawingPath ? `\n![Rysunek](${drawingPath})` : null,
].filter(line => line !== null).join('\n');

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

const blobAsDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać rysunku.'));
  reader.readAsDataURL(blob);
});

async function drawingDataUrl(note: Note): Promise<string | undefined> {
  if (!note.drawing_preview_path) return undefined;
  return blobAsDataUrl(await downloadNoteDrawingPreview(note.drawing_preview_path));
}

export async function exportSingleNote(note: Note, folder?: NoteFolder): Promise<void> {
  const markdown = noteAsMarkdown(note, folder?.name, await drawingDataUrl(note));
  downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), `${safeName(note.title)}.md`);
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]!));

export async function exportSingleNotePdf(note: Note, folder?: NoteFolder): Promise<void> {
  const preview = await drawingDataUrl(note);
  const printable = window.open('', '_blank', 'noopener,noreferrer');
  if (!printable) throw new Error('Przeglądarka zablokowała okno eksportu PDF.');
  printable.document.write(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title><style>body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:48px auto;padding:0 24px;color:#111}h1{font-size:32px}.meta{color:#666;font-size:13px;margin-bottom:28px}.content{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(note.title || 'Bez tytułu')}</h1><div class="meta">${folder ? `Folder: ${escapeHtml(folder.name)} · ` : ''}${note.tags.map(tag => `#${escapeHtml(tag)}`).join(' ')}</div><div class="content">${escapeHtml(getPlainText(note.content))}</div><script>addEventListener('load',()=>{print();setTimeout(()=>close(),500)})</script></body></html>`);
  if (preview) {
    const image = printable.document.createElement('img');
    image.src = preview;
    image.alt = 'Rysunek';
    image.style.cssText = 'display:block;max-width:100%;height:auto;margin-top:28px';
    printable.document.body.insertBefore(image, printable.document.body.lastElementChild);
  }
  printable.document.close();
}

export async function shareNoteCopy(note: Note, folder?: NoteFolder): Promise<void> {
  const markdown = noteAsMarkdown(note, folder?.name, await drawingDataUrl(note));
  const file = new File([markdown], `${safeName(note.title)}.md`, { type: 'text/markdown;charset=utf-8' });
  if (navigator.share) {
    const data: ShareData = { title: note.title || 'Notatka', text: markdown, files: [file] };
    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      await navigator.share(data);
      return;
    }
    await navigator.share({ title: data.title, text: markdown });
    return;
  }
  downloadBlob(file, file.name);
}

export async function buildNotesArchive(
  userId: string,
  notes: Note[],
  folders: NoteFolder[],
): Promise<Blob> {
  const zip = new JSZip();
  const folderNames = new Map(folders.map(folder => [folder.id, folder.name]));
  zip.file('manifest.json', JSON.stringify({
    exported_at: new Date().toISOString(),
    notes,
    folders,
  }, null, 2));

  for (const note of notes) {
    const drawingPath = note.drawing_preview_path ? `../drawings/${note.id}.png` : undefined;
    zip.file(
      `notes/${safeName(note.title)}-${note.id}.md`,
      noteAsMarkdown(note, note.folder_id ? folderNames.get(note.folder_id) : undefined, drawingPath),
    );
    if (note.drawing_preview_path) {
      const preview = await downloadNoteDrawingPreview(note.drawing_preview_path);
      zip.file(`drawings/${note.id}.png`, preview);
    }
  }

  const attachments = await listUserNoteAttachments(userId);
  const unlockedIds = new Set(notes.filter(note => !note.is_locked).map(note => note.id));
  for (const attachment of attachments.filter(item => unlockedIds.has(item.note_id))) {
    const file = await downloadNoteAttachmentFile(attachment.storage_path);
    zip.file(`attachments/${attachment.note_id}/${safeName(attachment.file_name)}`, file);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function exportNotesArchive(
  userId: string,
  notes: Note[],
  folders: NoteFolder[],
): Promise<void> {
  const blob = await buildNotesArchive(userId, notes, folders);
  downloadBlob(blob, `vanguard-notatki-${getTodayWarsaw()}.zip`);
}
