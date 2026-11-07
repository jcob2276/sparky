/**
 * @file braindumpApi.ts
 * @role Klient edge function parse-todo-braindump: monolog/dyktando -> lista zadań z priorytetem i ważnością.
 */
import { invokeEdge } from '../supabase';
import { getTodayWarsaw } from '../date';
import type { ParseTodoBraindumpResponse } from '../edgeTypes';

export type BrainDumpTask = ParseTodoBraindumpResponse['tasks'][number];

export async function parseTodoBraindump(
  text: string,
  sections: ReadonlyArray<{ id: string; name: string }>,
): Promise<BrainDumpTask[]> {
  const res = await invokeEdge('parse-todo-braindump', {
    body: { text, today: getTodayWarsaw(), sections: sections.map(({ id, name }) => ({ id, name })) },
  });
  return res.tasks ?? [];
}
