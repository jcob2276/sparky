import type { CloserCallRow } from './closerCallsApi';

export interface ReviewMoment {
  id: string;
  kind: 'practice' | 'repeat';
  timestamp: string;
  seconds: number | null;
  what: string;
  why: string;
}

export function timestampSeconds(value: string): number | null {
  const match = /^(?:(\d{1,3}):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/.exec(value.trim());
  return match ? Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null;
}

export function reviewMoments(call: Pick<CloserCallRow, 'ai_mistakes' | 'ai_good_moves'>): ReviewMoment[] {
  const groups = [['practice', call.ai_mistakes], ['repeat', call.ai_good_moves]] as const;
  return groups.flatMap(([kind, values]) => !Array.isArray(values) ? [] : values.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || !('what' in value) || typeof value.what !== 'string' || !value.what.trim()) return [];
    const timestamp = 'timestamp' in value && typeof value.timestamp === 'string' ? value.timestamp : '';
    return [{ id: kind + ':' + index, kind, timestamp, seconds: timestampSeconds(timestamp), what: value.what,
      why: 'why' in value && typeof value.why === 'string' ? value.why : '' }];
  })).sort((a, b) => (a.seconds ?? Infinity) - (b.seconds ?? Infinity));
}

export function fathomPlaybackUrls(shareUrl: string | null, seconds: number | null) {
  if (!shareUrl) return null;
  try {
    const url = new URL(shareUrl);
    const match = /^\/share\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
    if (url.protocol !== 'https:' || url.hostname !== 'fathom.video' || url.port || url.username || url.password || !match) return null;
    const embed = new URL('https://fathom.video/embed/' + match[1]);
    const external = new URL('https://fathom.video/share/' + match[1]);
    embed.searchParams.set('autoplay', '0');
    if (seconds !== null && Number.isFinite(seconds) && seconds >= 0) {
      external.searchParams.set('timestamp', String(seconds));
    }
    return { embed: embed.toString(), external: external.toString() };
  } catch { return null; }
}

export function transcriptExcerpt(transcript: CloserCallRow['transcript'], seconds: number | null) {
  if (!Array.isArray(transcript) || seconds === null) return [];
  const lines = transcript.flatMap(value => {
    if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string' || !value.text.trim()) return [];
    const timestamp = 'timestamp' in value && typeof value.timestamp === 'string' ? value.timestamp : '';
    const at = timestampSeconds(timestamp);
    if (at === null || at < seconds - 20 || at > seconds + 40) return [];
    const speaker = 'speaker' in value && value.speaker && typeof value.speaker === 'object' && 'display_name' in value.speaker
      && typeof value.speaker.display_name === 'string' ? value.speaker.display_name : 'Uczestnik';
    return [{ timestamp, speaker, text: value.text, at }];
  }).sort((a, b) => a.at - b.at);
  const target = lines.findIndex(line => line.at >= seconds);
  const start = Math.max(0, (target === -1 ? lines.length - 1 : target) - 3);
  return lines.slice(start, start + 8).map(({ timestamp, speaker, text }) => ({ timestamp, speaker, text }));
}

