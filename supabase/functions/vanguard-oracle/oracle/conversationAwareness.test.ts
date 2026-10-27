import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { formatConversationAwareness, humanGap } from './conversationAwareness.ts';

const now = new Date('2026-10-27T12:00:00Z'); // 13:00 Warszawa
const base = { now, todayDate: '2026-10-27', chat: [], meals: [], events: [], todos: [], pending: [] };

Deno.test('humanGap speaks in minutes, hours and days', () => {
  assertEquals(humanGap(now.getTime() - 5 * 60000, now.getTime()), '5 min temu');
  assertEquals(humanGap(now.getTime() - 200 * 60000, now.getTime()), '3 h 20 min temu');
  assertEquals(humanGap(now.getTime() - 50 * 3600000, now.getTime()), '2 dni temu');
});

Deno.test('unanswered assistant question is surfaced with its age', () => {
  const text = formatConversationAwareness({
    ...base,
    chat: [
      { role: 'assistant', content: 'Co blokuje diale?', created_at: '2026-10-27T11:40:00Z' },
      { role: 'user', content: 'dzień dobry', created_at: '2026-10-27T11:39:00Z' },
    ],
  });
  assertStringIncludes(text, '20 min temu');
  assertStringIncludes(text, 'Co blokuje diale?');
});

Deno.test('first chat of the day and empty meals are stated as missing data, not zero', () => {
  const text = formatConversationAwareness({
    ...base,
    chat: [{ role: 'user', content: 'x', created_at: '2026-10-25T10:00:00Z' }],
  });
  assertStringIncludes(text, 'pierwsza rozmowa dzisiaj');
  assertStringIncludes(text, 'nie dowód');
});

Deno.test('ongoing event and overdue todos appear', () => {
  const text = formatConversationAwareness({
    ...base,
    events: [{ summary: 'Cooper', start_time: '2026-10-27T11:30:00Z', end_time: '2026-10-27T12:30:00Z', location: null }],
    todos: [{ title: 'Faktura', due_date: '2026-10-25', is_important: true }],
  });
  assertStringIncludes(text, 'TRWA teraz');
  assertStringIncludes(text, 'Zaległe (1)');
});

Deno.test('question streak forces a non-question ending', () => {
  const text = formatConversationAwareness({
    ...base,
    chat: [
      { role: 'assistant', content: 'Dobra myśl. [SPLIT] Co dalej?', created_at: '2026-10-27T11:40:00Z' },
      { role: 'user', content: 'x', created_at: '2026-10-27T11:30:00Z' },
      { role: 'assistant', content: 'Skąd to?', created_at: '2026-10-27T11:20:00Z' },
    ],
  });
  assertStringIncludes(text, 'ostatnie 2 odpowiedzi');
  assertStringIncludes(text, 'NIE może kończyć się pytaniem');
});
