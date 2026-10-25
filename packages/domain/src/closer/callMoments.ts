/**
 * Momenty z analizy rozmowy sprzedażowej, zakotwiczone w transkrypcie. Model może zmyślić znacznik czasu albo cytat,
 * więc moment przechodzi tylko wtedy, gdy jego czas istnieje w transkrypcie (± tolerancja), a cytat, jeśli jest,
 * da się w nim znaleźć. Dzięki temu porady pokazują to, co naprawdę padło w rozmowie.
 */
export interface TranscriptLineInput {
  timestamp?: string;
  text?: string;
  speaker?: { display_name?: string };
}

export interface CallMoment {
  timestamp: string;
  quote: string | null;
  what: string;
  why: string;
  experiment: string | null;
}

const MAX_MOMENTS = 5;
const TIMESTAMP_TOLERANCE_S = 15;

export function callTimestampSeconds(value: string): number | null {
  const match = /^(?:(\d{1,3}):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/.exec(value.trim());
  return match ? Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null;
}

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Zostawia tylko momenty, których czas i cytat da się odnaleźć w transkrypcie; najwyżej 5. */
export function groundCallMoments(raw: unknown, transcript: TranscriptLineInput[]): CallMoment[] {
  if (!Array.isArray(raw)) return [];
  const lines = transcript.flatMap((line) => {
    const at = callTimestampSeconds(text(line.timestamp));
    return at === null ? [] : [{ at, text: normalize(text(line.text)) }];
  });
  const fullText = lines.map((line) => line.text).join(' ');
  return raw.flatMap((item): CallMoment[] => {
    const m = (item ?? {}) as Record<string, unknown>;
    const what = text(m.what);
    const timestamp = text(m.timestamp);
    const at = callTimestampSeconds(timestamp);
    if (!what || at === null) return [];
    if (!lines.some((line) => Math.abs(line.at - at) <= TIMESTAMP_TOLERANCE_S)) return [];
    const quote = text(m.quote);
    const quoteFound = quote.length > 0 && normalize(quote).length > 0 && fullText.includes(normalize(quote));
    if (quote && !quoteFound) return [];
    return [{ timestamp, quote: quote || null, what, why: text(m.why), experiment: text(m.experiment) || null }];
  }).slice(0, MAX_MOMENTS);
}
