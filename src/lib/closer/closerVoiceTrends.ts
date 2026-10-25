import type { CloserCallSummary } from './closerCallsApi';
import { windowTrend } from './closerTrendMath';

type VoiceCall = Pick<CloserCallSummary, 'started_at' | 'ai_call_kind' | 'call_metrics'>;

interface CallMetrics {
  mySharePct: number;
  wordsPerMinute: number | null;
  longestTurnSeconds: number | null;
  myQuestions: number;
  otherQuestions: number;
}

interface VoiceMetric {
  key: 'share' | 'longestTurn' | 'wpm' | 'clientQuestions';
  label: string;
  unit: string;
  /** Średnia z 5 ostatnich rozmów albo null przy za małej próbie. */
  recent: number | null;
  delta: number | null;
  /** W którą stronę zmiana jest dobra: spadek, wzrost albo bez oceny. */
  better: 'lower' | 'higher' | 'none';
  hint: string | null;
}

export interface VoiceReport {
  calls: number;
  metrics: VoiceMetric[];
}

const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Bezpiecznie czyta `call_metrics` (JSONB); w złym kształcie zwraca null. */
function parseCallMetrics(value: unknown): CallMetrics | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  const turn = m.longestTurn && typeof m.longestTurn === 'object' ? (m.longestTurn as Record<string, unknown>) : null;
  const share = asNumber(m.mySharePct);
  const mine = asNumber(m.myQuestions);
  const other = asNumber(m.otherQuestions);
  if (share === null || mine === null || other === null) return null;
  return { mySharePct: share, wordsPerMinute: asNumber(m.wordsPerMinute), longestTurnSeconds: turn ? asNumber(turn.seconds) : null, myQuestions: mine, otherQuestions: other };
}

/** Trendy prowadzenia rozmowy w rozmowach sprzedażowych: udział w mówieniu, najdłuższa wypowiedź, tempo, pytania klienta. */
export function voiceReport(calls: VoiceCall[]): VoiceReport {
  const sales = calls.filter(call => call.ai_call_kind === 'sales')
    .flatMap(call => { const metrics = parseCallMetrics(call.call_metrics); return metrics ? [{ at: call.started_at, metrics }] : []; })
    .sort((a, b) => b.at.localeCompare(a.at));
  const series = (pick: (m: CallMetrics) => number | null) => sales.flatMap(call => pick(call.metrics) ?? []);
  const metric = (key: VoiceMetric['key'], label: string, unit: string, better: VoiceMetric['better'], hint: string | null, values: number[]): VoiceMetric =>
    ({ key, label, unit, better, hint, ...windowTrend(values) });
  return {
    calls: sales.length,
    metrics: [
      metric('share', 'Twój udział w mówieniu', '%', 'lower', 'orientacyjnie 40–50% w rozmowie o potrzebach', series(m => m.mySharePct)),
      metric('longestTurn', 'Najdłuższa wypowiedź bez przerwy', 's', 'lower', null, series(m => m.longestTurnSeconds)),
      metric('clientQuestions', 'Pytania klienta na rozmowę', '', 'higher', 'klient pyta, gdy jest zaangażowany', series(m => m.otherQuestions)),
      metric('wpm', 'Tempo (przybliżone)', 'słów/min', 'none', 'transkrypt ma tylko początki wypowiedzi', series(m => m.wordsPerMinute)),
    ],
  };
}
