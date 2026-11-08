import { getTodayWarsaw, shiftDateStr, TIMEZONE } from '../date';
import type { CalRow } from '../appleCalendar/types';

export type { CalRow } from '../appleCalendar/types';

export * from '../appleCalendar/appleDateInterval';
export * from '../appleCalendar/appleRecurrenceEngine';
export * from '../appleCalendar/appleEventLayoutEngine';
export * from '../appleCalendar/appleAlarmEngine';

const warsawOffsetFormatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'shortOffset' });

export function getWarsawOffset(date?: string | Date): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date passed to getWarsawOffset: ${date}`);
  }
  const tzPart = warsawOffsetFormatter.formatToParts(d).find(p => p.type === 'timeZoneName')?.value;
  if (!tzPart) {
    const month = d.getMonth();
    return (month >= 3 && month <= 9) ? '+02:00' : '+01:00';
  }
  const numStr = tzPart.replace('GMT', '');
  if (numStr === '') return '+00:00';
  if (numStr.includes(':')) {
    return numStr.length === 5 ? numStr[0] + '0' + numStr.slice(1) : numStr;
  }
  const sign = numStr[0];
  const hour = parseInt(numStr.slice(1), 10);
  return sign + String(hour).padStart(2, '0') + ':00';
}
export const HOUR_START = 5;
export const HOUR_END = 24;
export const HOURS = HOUR_END - HOUR_START;
export const PX_PER_HOUR = 54;
export const PX_PER_MIN = PX_PER_HOUR / 60;

export const minutesLabel = (minutes: number) => (
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
);

export function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(dateStr: string, n: number) {
  return shiftDateStr(dateStr, n);
}

export function weekMon(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Mon=0
  return shiftDateStr(dateStr, -dow);
}

export function todayStr() {
  return getTodayWarsaw();
}

export function dayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' });
}

export function formatWeekdayShort(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { weekday: 'short' });
}

export function monthLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatQuickDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('pl-PL', { weekday: 'short' });
  const dayMonth = dt.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  return `${weekday}, ${dayMonth}`;
}

const warsawPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

function getWarsawParts(isoStr: string) {
  const normalized = isoStr.includes(' ') && !isoStr.includes('T') ? isoStr.replace(' ', 'T') : isoStr;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) throw new Error(`Invalid date string: ${isoStr}`);

  const parts = warsawPartsFormatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    dateStr: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    timeStr: `${getPart('hour')}:${getPart('minute')}`
  };
}

export function parseTime(iso: string) {
  try {
    const { hour, minute } = getWarsawParts(iso);
    return Number(hour) * 60 + Number(minute);
  } catch (_e: unknown) {
    return 0;
  }
}

export function formatTime(iso: string) {
  try {
    const { timeStr } = getWarsawParts(iso);
    return timeStr;
  } catch (_e: unknown) {
    return '';
  }
}

export function dateOfISO(iso: string) {
  try {
    const { dateStr } = getWarsawParts(iso);
    return dateStr;
  } catch (_e: unknown) {
    return iso.split('T')[0] || iso.split(' ')[0] || '';
  }
}

// Google Calendar expands recurring events into per-instance rows whose id is
// `{recurringEventId}_{YYYYMMDDTHHMMSSZ}` (from the `singleEvents=true` sync).
// Deleting the instance id removes just that occurrence; deleting the base id
// removes the whole series. This regex recovers the base id when present.
const RECURRING_INSTANCE_ID_RE = /^(.+)_(\d{8}T\d{6}Z)$/;

export function recurringSeriesBaseId(eventId: string | null | undefined): string | null {
  if (!eventId) return null;
  const match = eventId.match(RECURRING_INSTANCE_ID_RE);
  return match ? match[1] : null;
}

export function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/** „Sen” / „Sleep” jako osobne słowo na początku tytułu (nie „Sensor” ani „Konsensus”). */
export function isSleepSummary(summary: string | null | undefined): boolean {
  return /^[^\p{L}\p{N}]*(?:sen|sleep)(?![\p{L}\p{N}])/iu.test(summary ?? '');
}

export function eventColor(ev: CalRow) {
  const summaryLower = ev.summary?.toLowerCase() || '';
  const isFocusTime = ev.summary?.includes('Focus Time') || ev.summary?.includes('🛡️');
  if (isFocusTime) {
    return 'bg-primary/22 dark:bg-primary/25 text-primary-hover dark:text-primary-hover border border-primary/50 font-bold';
  }

  const categoryMap: Record<string, string> = {
    brak: 'bg-indigo-500 text-white border border-indigo-600 border-l-[4px] border-l-indigo-700 shadow-2xs hover:bg-indigo-600',
    none: 'bg-indigo-500 text-white border border-indigo-600 border-l-[4px] border-l-indigo-700 shadow-2xs hover:bg-indigo-600',
    praca: 'bg-blue-500 text-white border border-blue-600 border-l-[4px] border-l-blue-700 shadow-2xs hover:bg-blue-600',
    work: 'bg-blue-500 text-white border border-blue-600 border-l-[4px] border-l-blue-700 shadow-2xs hover:bg-blue-600',
    cialo_trening: 'bg-emerald-500 text-white border border-emerald-600 border-l-[4px] border-l-emerald-700 shadow-2xs hover:bg-emerald-600',
    health: 'bg-emerald-500 text-white border border-emerald-600 border-l-[4px] border-l-emerald-700 shadow-2xs hover:bg-emerald-600',
    sport: 'bg-emerald-500 text-white border border-emerald-600 border-l-[4px] border-l-emerald-700 shadow-2xs hover:bg-emerald-600',
    duch_refleksja: 'bg-cyan-500 text-white border border-cyan-600 border-l-[4px] border-l-cyan-700 shadow-2xs hover:bg-cyan-600',
    study: 'bg-cyan-500 text-white border border-cyan-600 border-l-[4px] border-l-cyan-700 shadow-2xs hover:bg-cyan-600',
    finanse: 'bg-amber-500 text-white border border-amber-600 border-l-[4px] border-l-amber-700 shadow-2xs hover:bg-amber-600',
    relacje_rodzina: 'bg-purple-500 text-white border border-purple-600 border-l-[4px] border-l-purple-700 shadow-2xs hover:bg-purple-600',
    personal: 'bg-purple-500 text-white border border-purple-600 border-l-[4px] border-l-purple-700 shadow-2xs hover:bg-purple-600',
    odpoczynek_regeneracja: 'bg-rose-500 text-white border border-rose-600 border-l-[4px] border-l-rose-700 shadow-2xs hover:bg-rose-600',
  };

  // 1. Explicit database category
  const catKey = ev.category?.toLowerCase();
  if (catKey && categoryMap[catKey]) {
    return categoryMap[catKey];
  }

  // 2. Keyword-based fallbacks for uncategorized events
  if (
    summaryLower.includes('work block') ||
    summaryLower.includes('kodowan') ||
    summaryLower.includes('dev') ||
    summaryLower.includes('praca') ||
    summaryLower.includes(' and jakub') ||
    summaryLower.includes(' i jakub') ||
    summaryLower.includes('call') ||
    summaryLower.includes('meeting') ||
    summaryLower.includes('sync') ||
    summaryLower.includes('konsultacj') ||
    summaryLower.startsWith('ns ')
  ) {
    return categoryMap['praca'];
  }
  if (isSleepSummary(summaryLower) || summaryLower.includes('sauna') || summaryLower.includes('regeneracj')) {
    return categoryMap['odpoczynek_regeneracja'];
  }
  if (summaryLower.includes('bieg') || summaryLower.includes('trening') || summaryLower.includes('siłownia') || summaryLower.includes('run') || summaryLower.includes('gym') || summaryLower.includes('workout') || summaryLower.includes('tenis') || summaryLower.includes('logopeda')) {
    return categoryMap['cialo_trening'];
  }
  if (summaryLower.includes('medyt') || summaryLower.includes('reflek') || summaryLower.includes('cich') || summaryLower.includes('silent') || summaryLower.includes('mindful')) {
    return categoryMap['duch_refleksja'];
  }
  if (summaryLower.includes('budżet') || summaryLower.includes('finans') || summaryLower.includes('money') || summaryLower.includes('invest') || summaryLower.includes('giełd') || summaryLower.includes('faktura')) {
    return categoryMap['finanse'];
  }
  if (summaryLower.includes('rodzin') || summaryLower.includes('randk') || summaryLower.includes('spotkan') || summaryLower.includes('koleg') || summaryLower.includes('znajom') || summaryLower.includes('dinner') || summaryLower.includes('date') || summaryLower.includes('urodzin') || summaryLower.includes('babcia') || summaryLower.includes('piłka') || summaryLower.includes('pilka') || summaryLower.includes('wypad')) {
    if (!summaryLower.includes('pracy') && !summaryLower.includes('work') && !summaryLower.includes('daily') && !summaryLower.includes('sync')) {
      return categoryMap['relacje_rodzina'];
    }
  }

  return categoryMap['praca'];
}

export interface MonthDayInfo {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthGridDays(dateStr: string): MonthDayInfo[] {
  const [y, m] = dateStr.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const lastOfMonth = new Date(y, m, 0);

  const firstDayOfWeek = (firstOfMonth.getDay() + 6) % 7; // Mon=0
  const startDate = new Date(firstOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfWeek);

  const days: MonthDayInfo[] = [];
  const today = todayStr();

  const totalDays = (firstDayOfWeek + lastOfMonth.getDate()) > 35 ? 42 : 35;

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(startDate);
    cur.setDate(cur.getDate() + i);
    const yStr = cur.getFullYear();
    const mStr = String(cur.getMonth() + 1).padStart(2, '0');
    const dStr = String(cur.getDate()).padStart(2, '0');
    const curDateStr = `${yStr}-${mStr}-${dStr}`;

    days.push({
      dateStr: curDateStr,
      dayNumber: cur.getDate(),
      isCurrentMonth: cur.getMonth() === m - 1,
      isToday: curDateStr === today,
    });
  }

  return days;
}

export interface VideoCallDetection {
  url: string;
  provider: 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'FaceTime' | 'Spotkanie Wideo';
}

export function detectVideoCallUrl(text?: string | null): VideoCallDetection | null {
  if (!text) return null;
  const meetMatch = text.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i);
  if (meetMatch) return { url: meetMatch[0], provider: 'Google Meet' };

  const zoomMatch = text.match(/https?:\/\/[a-z0-9-]+\.zoom\.us\/j\/[0-9?=&-]+/i);
  if (zoomMatch) return { url: zoomMatch[0], provider: 'Zoom' };

  const teamsMatch = text.match(/https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s>]+/i);
  if (teamsMatch) return { url: teamsMatch[0], provider: 'Microsoft Teams' };

  const ftMatch = text.match(/https?:\/\/facetime\.apple\.com\/join[^\s>]+/i);
  if (ftMatch) return { url: ftMatch[0], provider: 'FaceTime' };

  const genericMatch = text.match(/https?:\/\/[^\s>]*(meet|zoom|teams|whereby|jitsi)[^\s>]*/i);
  if (genericMatch) return { url: genericMatch[0], provider: 'Spotkanie Wideo' };

  return null;
}

export function getISOWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round(dayDiff / 7);
}

