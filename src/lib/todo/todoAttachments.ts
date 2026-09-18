import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { unwrap, unwrapList } from '../supabaseUtils';

export type TodoAttachmentRow = Database['public']['Tables']['todo_attachments']['Row'];

export async function listAttachments(todoItemId: string): Promise<TodoAttachmentRow[]> {
  return unwrapList(
    await supabase
      .from('todo_attachments')
      .select('*')
      .eq('todo_item_id', todoItemId)
      .order('created_at', { ascending: true }),
  );
}

export async function uploadAttachment(userId: string, todoItemId: string, file: File): Promise<TodoAttachmentRow> {
  const path = `${userId}/${todoItemId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('todo-attachments').upload(path, file);
  if (upErr) throw new Error(upErr.message);
  const { data: { publicUrl } } = supabase.storage.from('todo-attachments').getPublicUrl(path);

  return unwrap(
    await supabase
      .from('todo_attachments')
      .insert({
        todo_item_id: todoItemId,
        user_id: userId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single(),
  );
}

export async function deleteAttachment(attachment: Pick<TodoAttachmentRow, 'id' | 'file_url'>): Promise<void> {
  const marker = '/todo-attachments/';
  const idx = attachment.file_url.indexOf(marker);
  if (idx !== -1) {
    const path = attachment.file_url.slice(idx + marker.length);
    await supabase.storage.from('todo-attachments').remove([path]);
  }
  const { error } = await supabase.from('todo_attachments').delete().eq('id', attachment.id);
  if (error) throw new Error(error.message);
}
