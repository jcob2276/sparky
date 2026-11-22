import { useState } from 'react';
import { invokeEdge } from '../../lib/supabase';
import { notify } from '../../lib/notify';
import { createSourceTodos } from '../../lib/behavior/captureBridge';
import { getPlainText } from './keepUtils';

/** Akcje AI na notatce (podsumowanie i wyciąganie zadań) razem z wynikiem do pokazania w edytorze. */
export function useNoteAi({ content, title, noteId, userId }: { content: string; title: string; noteId: string; userId: string | null | undefined }) {
  const [, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ type: string; text: string } | null>(null);
  const aiSummarize = async () => {
    setAiLoading('summary');
    setAiResult(null);
    try {
      const plain = getPlainText(content);
      if (plain.length < 20) { notify('Notatka jest za krótka.', 'error'); setAiLoading(null); return; }
      const data = await invokeEdge('vanguard-oracle', {
        body: { mode: 'note_summary', content: plain, title: title }
      }) as { summary?: string; response?: string; content?: string };
      setAiResult({ type: 'summary', text: data?.summary || data?.response || data?.content || 'Brak odpowiedzi.' });
    } catch (e: unknown) {
      notify('Błąd AI: ' + (e instanceof Error ? e.message : 'Nieznany błąd'), 'error');
    }
    setAiLoading(null);
  };
  const aiExtractTasks = async () => {
    setAiLoading('tasks');
    setAiResult(null);
    try {
      const plain = getPlainText(content);
      if (plain.length < 20) { notify('Notatka jest za krótka.', 'error'); setAiLoading(null); return; }
      const data = await invokeEdge('vanguard-oracle', {
        body: { mode: 'extract_tasks', content: plain, title: title }
      }) as { tasks?: string[] };
      const tasks: string[] = data?.tasks || [];
      if (tasks.length === 0) { setAiResult({ type: 'tasks', text: 'Brak zadań.' }); setAiLoading(null); return; }
      if (!userId) throw new Error('Brak zalogowanego użytkownika');
      
      const created = await createSourceTodos(userId, tasks, `source:note:${noteId}`);
      setAiResult({ type: 'tasks', text: created.length ? `Dodano ${created.length} zadań.` : 'Nie dodano duplikatów.' });
      notify(created.length ? `Dodano ${created.length} zadań do listy.` : 'Te zadania są już na liście.', 'success');
    } catch (e: unknown) {
      notify('Błąd AI: ' + (e instanceof Error ? e.message : 'Nieznany błąd'), 'error');
    }
    setAiLoading(null);
  };
  return { aiResult, setAiResult, aiSummarize, aiExtractTasks };
}
