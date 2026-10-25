import { describe, expect, it } from 'vitest';
import { computeCallTalkMetrics } from '@vanguard/domain';

const me = { display_name: 'Jakub', matched_calendar_invitee_email: 'Me@Example.com' };
const client = { display_name: 'Klientka', matched_calendar_invitee_email: 'k@example.com' };
const transcript = [
  { timestamp: '00:00:00', speaker: me, text: 'Cześć, opowiedz mi jak to wygląda u Ciebie dzisiaj?' },
  { timestamp: '00:00:05', speaker: me, text: 'Dopytam jeszcze o jedno.' },
  { timestamp: '00:00:30', speaker: client, text: 'Szukam spokoju i więcej czasu dla siebie, ale boję się zmiany.' },
  { timestamp: '00:00:50', speaker: me, text: 'Rozumiem. Co konkretnie Cię powstrzymuje?' },
  { timestamp: '00:01:10', speaker: client, text: 'Nie wiem, czy dam radę.' },
];

describe('computeCallTalkMetrics', () => {
  it('liczy udział, pytania i najdłuższą wypowiedź (scala kolejne linie tego samego mówcy)', () => {
    const m = computeCallTalkMetrics(transcript, 'me@example.com')!;
    expect(m.myWords).toBe(9 + 4 + 5);
    expect(m.otherWords).toBe(11 + 5);
    expect(m.mySharePct).toBe(53);
    expect(m.myQuestions).toBe(2);
    expect(m.otherQuestions).toBe(0);
    expect(m.longestTurn).toEqual({ seconds: 30, words: 13, at: '00:00:00' });
    expect(m.wordsPerMinute).toBeNull();
  });

  it('zwraca null, gdy nie rozpoznaje właściciela albo brak tekstu', () => {
    expect(computeCallTalkMetrics(transcript, 'inny@example.com')).toBeNull();
    expect(computeCallTalkMetrics(transcript, '')).toBeNull();
    expect(computeCallTalkMetrics([], 'me@example.com')).toBeNull();
  });
});
