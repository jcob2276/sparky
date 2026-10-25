import { describe, expect, it } from 'vitest';
import { voiceReport } from './closerVoiceTrends';
import type { Json } from '../database.types';

const metrics = (share: number, turn: number | null, other: number, wpm: number | null = 130): Json =>
  ({ mySharePct: share, myWords: 100, otherWords: 100, wordsPerMinute: wpm, longestTurn: turn === null ? null : { seconds: turn, words: 80, at: '00:01:00' }, myQuestions: 10, otherQuestions: other });
const call = (day: number, m: Json | null, kind: string | null = 'sales') =>
  ({ started_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, ai_call_kind: kind, call_metrics: m });

describe('voiceReport', () => {
  const calls = [
    ...[1, 2, 3, 4, 5].map(d => call(d, metrics(80, 60, 5))),
    ...[11, 12, 13, 14, 15].map(d => call(d, metrics(60, 40, 15))),
  ];

  it('liczy średnią z 5 ostatnich rozmów i zmianę względem poprzednich 5', () => {
    const share = voiceReport(calls).metrics.find(m => m.key === 'share')!;
    expect(share).toMatchObject({ recent: 60, delta: -20, better: 'lower' });
    expect(voiceReport(calls).metrics.find(m => m.key === 'clientQuestions')).toMatchObject({ recent: 15, delta: 10 });
  });

  it('pomija rozmowy niesprzedażowe i bez metryk; brakujące wartości nie zaniżają średnich', () => {
    const report = voiceReport([...calls, call(20, metrics(10, 5, 0), 'other'), call(21, null), call(22, metrics(70, null, 8, null))]);
    expect(report.calls).toBe(11);
    expect(report.metrics.find(m => m.key === 'longestTurn')!.recent).not.toBeNull();
  });

  it('przy mniej niż 3 rozmowach nie podaje średniej', () => {
    expect(voiceReport([call(1, metrics(70, 50, 4))]).metrics.every(m => m.recent === null)).toBe(true);
  });
});
