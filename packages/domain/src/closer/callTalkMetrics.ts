/**
 * Metryki prowadzenia rozmowy liczone wprost z transkryptu (bez AI): udział w mówieniu, najdłuższa wypowiedź,
 * tempo i pytania. „Ja" to mówca z adresem właściciela konta w danych Fathoma. Transkrypt ma tylko początki
 * wypowiedzi (z dokładnością do sekundy), więc czas wypowiedzi i tempo są przybliżone, a ciszy po cenie nie da się zmierzyć.
 */
import { callTimestampSeconds, type TranscriptLineInput } from './callMoments.ts';

export interface CallTalkMetrics {
  /** Moje słowa w stosunku do słów wszystkich uczestników, w procentach. */
  mySharePct: number;
  myWords: number;
  otherWords: number;
  /** Słowa na minutę w moich wypowiedziach (z pauzami) albo null, gdy za mało danych. */
  wordsPerMinute: number | null;
  /** Najdłuższa moja wypowiedź bez przerwy: czas w sekundach, słowa i moment w rozmowie. */
  longestTurn: { seconds: number; words: number; at: string } | null;
  myQuestions: number;
  otherQuestions: number;
}

interface Turn { speaker: string; mine: boolean; at: number; stamp: string; words: number; questions: number }

const MIN_TURN_SECONDS = 3;
const MAX_TURN_SECONDS = 300;
const MIN_WPM_SAMPLE_WORDS = 200;

const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;
const questionCount = (value: string) => (value.match(/\?/g) ?? []).length;

export function computeCallTalkMetrics(transcript: TranscriptLineInput[], ownerEmail: string): CallTalkMetrics | null {
  const owner = ownerEmail.trim().toLowerCase();
  if (!owner) return null;
  const turns: Turn[] = [];
  for (const line of transcript) {
    const stamp = (line.timestamp ?? '').trim();
    const at = callTimestampSeconds(stamp);
    const text = (line.text ?? '').trim();
    if (at === null || !text) continue;
    const speaker = line.speaker?.display_name ?? '?';
    const mine = (line.speaker?.matched_calendar_invitee_email ?? '').trim().toLowerCase() === owner;
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      last.words += wordCount(text);
      last.questions += questionCount(text);
    } else {
      turns.push({ speaker, mine, at, stamp, words: wordCount(text), questions: questionCount(text) });
    }
  }
  const myTurns = turns.filter((turn) => turn.mine);
  if (!myTurns.length) return null;

  const myWords = myTurns.reduce((sum, turn) => sum + turn.words, 0);
  const otherWords = turns.filter((turn) => !turn.mine).reduce((sum, turn) => sum + turn.words, 0);
  if (myWords + otherWords === 0) return null;

  const timed = turns.flatMap((turn, index) => {
    const next = turns[index + 1];
    const seconds = next ? next.at - turn.at : 0;
    return turn.mine && seconds >= MIN_TURN_SECONDS && seconds <= MAX_TURN_SECONDS ? [{ turn, seconds }] : [];
  });
  const timedWords = timed.reduce((sum, item) => sum + item.turn.words, 0);
  const timedSeconds = timed.reduce((sum, item) => sum + item.seconds, 0);
  const longest = timed.reduce<(typeof timed)[number] | null>((best, item) => (!best || item.turn.words > best.turn.words ? item : best), null);

  return {
    mySharePct: Math.round((100 * myWords) / (myWords + otherWords)),
    myWords,
    otherWords,
    wordsPerMinute: timedWords >= MIN_WPM_SAMPLE_WORDS ? Math.round((timedWords / timedSeconds) * 60) : null,
    longestTurn: longest ? { seconds: Math.round(longest.seconds), words: longest.turn.words, at: longest.turn.stamp } : null,
    myQuestions: myTurns.reduce((sum, turn) => sum + turn.questions, 0),
    otherQuestions: turns.filter((turn) => !turn.mine).reduce((sum, turn) => sum + turn.questions, 0),
  };
}
