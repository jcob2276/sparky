/**
 * analystHistoryService.ts — Zarządzanie historią konwersacji Analityka AI.
 * Zapis w localStorage, tworzenie, aktualizacja, usuwanie i wyszukiwanie wątków.
 */

import { ChatMessage } from './investmentsAiService';

const HISTORY_STORAGE_KEY = 'sparky_analyst_conversations_v1';
const MAX_CONVERSATIONS = 50;

export interface AnalystConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export function loadAnalystConversations(): AnalystConversation[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is AnalystConversation => {
        return (
          item != null &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages)
        );
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch {
    return [];
  }
}

function saveAnalystConversations(conversations: AnalystConversation[]): void {
  try {
    const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* prywatny tryb przeglądarki */
  }
}

export function createNewConversation(firstMessage: string): AnalystConversation {
  const now = new Date().toISOString();
  const clean = firstMessage.trim().replace(/\s+/g, ' ');
  const title = clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;

  return {
    id: crypto.randomUUID(),
    title: title || 'Rozmowa z analitykiem',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function upsertConversation(conv: AnalystConversation): AnalystConversation[] {
  const list = loadAnalystConversations();
  const idx = list.findIndex((c) => c.id === conv.id);
  const updatedEntry: AnalystConversation = {
    ...conv,
    updatedAt: new Date().toISOString(),
  };

  let result: AnalystConversation[];
  if (idx >= 0) {
    result = [...list];
    result[idx] = updatedEntry;
    // Move updated conversation to the top
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else {
    result = [updatedEntry, ...list];
  }

  saveAnalystConversations(result);
  return result;
}

export function removeConversation(id: string): AnalystConversation[] {
  const list = loadAnalystConversations();
  const filtered = list.filter((c) => c.id !== id);
  saveAnalystConversations(filtered);
  return filtered;
}
