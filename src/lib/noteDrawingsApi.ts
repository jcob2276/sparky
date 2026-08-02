import { useQuery } from '@tanstack/react-query';
import type { DrawingDocument } from './drawing/drawingModel';
import { parseDrawingDocument } from './drawing/drawingModel';
import type { Json } from './database.types';
import { supabase } from './supabase';

const BUCKET = 'note-attachments';

export interface NoteDrawing {
  id: string;
  userId: string;
  noteId: string;
  document: DrawingDocument;
  previewStoragePath: string | null;
  previewUrl?: string;
  ocrText: string;
  updatedAt: string;
}

const mapDrawing = async (row: Record<string, unknown>): Promise<NoteDrawing> => {
  const path = typeof row.preview_storage_path === 'string' ? row.preview_storage_path : null;
  const signed = path
    ? await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    : null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    noteId: String(row.note_id),
    document: parseDrawingDocument(row.document),
    previewStoragePath: path,
    previewUrl: signed?.data?.signedUrl,
    ocrText: typeof row.ocr_text === 'string' ? row.ocr_text : '',
    updatedAt: String(row.updated_at),
  };
};

export function useNoteDrawing(noteId: string) {
  return useQuery({
    queryKey: ['notes', 'drawing', noteId],
    queryFn: async () => {
      const { data, error } = await supabase.from('note_drawings').select('*').eq('note_id', noteId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapDrawing(data) : null;
    },
    enabled: !!noteId,
  });
}

export async function hasNoteDrawing(noteId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('note_drawings')
    .select('id', { count: 'exact', head: true })
    .eq('note_id', noteId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function downloadNoteDrawingPreview(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? 'Nie udało się pobrać podglądu rysunku.');
  return data;
}

export async function saveNoteDrawing(
  userId: string,
  noteId: string,
  document: DrawingDocument,
  preview?: Blob,
): Promise<void> {
  let previewPath: string | undefined;
  if (preview) {
    previewPath = `${userId}/${noteId}/drawing-preview.png`;
    const { error } = await supabase.storage.from(BUCKET).upload(previewPath, preview, {
      contentType: 'image/png',
      upsert: true,
    });
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from('note_drawings').upsert({
    user_id: userId,
    note_id: noteId,
    schema_version: document.schemaVersion,
    document: document as unknown as Json,
    width: document.width,
    height: document.height,
    ...(previewPath ? { preview_storage_path: previewPath } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'note_id' });
  if (error) throw new Error(error.message);
}

export async function updateNoteDrawingOcr(noteId: string, text: string): Promise<void> {
  const { error } = await supabase.from('note_drawings').update({
    ocr_text: text,
    updated_at: new Date().toISOString(),
  }).eq('note_id', noteId);
  if (error) throw new Error(error.message);
}
