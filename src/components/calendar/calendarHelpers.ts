import { getTodayWarsaw, shiftDateStr, TIMEZONE } from '../../lib/date';
import { CATEGORY_COLORS } from '../../lib/projects/lifeSpheres';

export * from '../../lib/appleCalendar/appleDateInterval';
export * from '../../lib/appleCalendar/appleRecurrenceEngine';
export * from '../../lib/appleCalendar/appleEventLayoutEngine';
export * from '../../lib/appleCalendar/appleAlarmEngine';

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
export const HOUR_END = 23;
export const HOURS = HOUR_END - HOUR_START;
export const PX_PER_HOUR = 54;
export const PX_PER_MIN = PX_PER_HOUR / 60;

export const minutesLabel = (minutes: number) => (
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
);

export interface CalRow {
  id: string;
  event_id: string | null;
  summary: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  description?: string | null;
  location?: string | null;
  is_all_day?: boolean | null;
  reminder_minutes?: number | null;
  recurrence?: string[] | null;
  series_id?: string | null;
}
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

export function computeBudgetBarState(
  spent: number,
  minVal: number | null | undefined,
  maxVal: number | null | undefined,
  baseColor: string,
): { pct: number; statusText: string; barColor: string } {
  if (minVal != null && minVal > 0 && maxVal != null && maxVal > 0) {
    return {
      pct: Math.min(100, (spent / maxVal) * 100),
      statusText: `${spent.toFixed(1)}h / ${minVal}–${maxVal}h`,
      barColor:
        spent < minVal
          ? 'bg-warning dark:bg-warning'
          : spent > maxVal
          ? 'bg-danger dark:bg-danger'
          : 'bg-success dark:bg-success',
    };
  }
  if (minVal != null && minVal > 0) {
    return {
      pct: Math.min(100, (spent / minVal) * 100),
      statusText: `${spent.toFixed(1)}h / min ${minVal}h`,
      barColor: spent >= minVal ? 'bg-success dark:bg-success' : 'bg-warning dark:bg-warning',
    };
  }
  if (maxVal != null && maxVal > 0) {
    return {
      pct: Math.min(100, (spent / maxVal) * 100),
      statusText: `${spent.toFixed(1)}h / max ${maxVal}h`,
      barColor: spent > maxVal ? 'bg-danger dark:bg-danger' : baseColor,
    };
  }
  return { pct: 0, statusText: `${spent.toFixed(1)}h`, barColor: baseColor };
}

export function eventColor(ev: CalRow) {
  const summaryLower = ev.summary?.toLowerCase() || '';
  const isFocusTime = ev.summary?.includes('Focus Time') || ev.summary?.includes('🛡️');
  if (isFocusTime) {
    return 'bg-primary/22 dark:bg-primary/25 text-primary-hover dark:text-primary-hover border border-primary/50 font-bold';
  }

  const categoryMap: Record<string, string> = {
    praca: 'bg-info/22 dark:bg-info/25 text-info-hover dark:text-info-hover border border-info/50 font-bold',
    work: 'bg-info/22 dark:bg-info/25 text-info-hover dark:text-info-hover border border-info/50 font-bold',
    cialo_trening: 'bg-success/22 dark:bg-success/25 text-success-hover dark:text-success-hover border border-success/50 font-bold',
    health: 'bg-success/22 dark:bg-success/25 text-success-hover dark:text-success-hover border border-success/50 font-bold',
    sport: 'bg-success/22 dark:bg-success/25 text-success-hover dark:text-success-hover border border-success/50 font-bold',
    duch_refleksja: 'bg-sky-500/22 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/50 font-bold',
    study: 'bg-sky-500/22 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/50 font-bold',
    finanse: 'bg-warning/22 dark:bg-warning/25 text-warning-hover dark:text-warning-hover border border-warning/50 font-bold',
    relacje_rodzina: 'bg-violet-500/22 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-500/50 font-bold',
    personal: 'bg-violet-500/22 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-500/50 font-bold',
    odpoczynek_regeneracja: 'bg-danger/22 dark:bg-danger/25 text-danger-hover dark:text-danger-hover border border-danger/50 font-bold',
  };

  // 1. Explicit database category
  const catKey = ev.category?.toLowerCase();
  if (catKey && categoryMap[catKey]) {
    return categoryMap[catKey];
  }

  // 2. Keyword-based fallbacks for uncategorized events
  if (summaryLower.includes('sen') || summaryLower.includes('sleep') || summaryLower.includes('sauna')) {
    return categoryMap['odpoczynek_regeneracja'];
  }
  if (summaryLower.includes('bieg') || summaryLower.includes('trening') || summaryLower.includes('siłownia') || summaryLower.includes('run') || summaryLower.includes('gym') || summaryLower.includes('workout')) {
    return categoryMap['cialo_trening'];
  }
  if (summaryLower.includes('medyt') || summaryLower.includes('reflek') || summaryLower.includes('cich') || summaryLower.includes('silent') || summaryLower.includes('mindful')) {
    return categoryMap['duch_refleksja'];
  }
  if (summaryLower.includes('budżet') || summaryLower.includes('finans') || summaryLower.includes('money') || summaryLower.includes('invest') || summaryLower.includes('giełd')) {
    return categoryMap['finanse'];
  }
  if (summaryLower.includes('rodzin') || summaryLower.includes('randk') || summaryLower.includes('spotkan') || summaryLower.includes('koleg') || summaryLower.includes('znajom') || summaryLower.includes('dinner') || summaryLower.includes('date') || summaryLower.includes('urodzin') || summaryLower.includes('babcia') || summaryLower.includes('piłka') || summaryLower.includes('pilka')) {
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

export function formatRangeLabel(calView: string, selectedDay: string, weekStart: string): string {
  const [y, m, d] = selectedDay.split('-').map(Number);
  const selDate = new Date(y, m - 1, d);
  const weekNum = getISOWeekNumber(selectedDay);

  if (calView === 'dzien') {
    return `${selDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (Tydz. ${weekNum})`;
  }
  if (calView === '3dni') {
    const endStr = addDays(selectedDay, 2);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    if (m === em) {
      return `${d}–${ed} ${selDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })} (Tydz. ${weekNum})`;
    }
    return `${d} ${selDate.toLocaleDateString('pl-PL', { month: 'short' })} – ${ed} ${endDate.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })} (Tydz. ${weekNum})`;
  }
  if (calView === 'tydzien') {
    const weekEnd = addDays(weekStart, 6);
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    const eDate = new Date(ey, em - 1, ed);
    const wNum = getISOWeekNumber(weekStart);
    if (sm === em) {
      return `${sd}–${ed} ${sDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })} (Tydz. ${wNum})`;
    }
    return `${sd} ${sDate.toLocaleDateString('pl-PL', { month: 'short' })} – ${ed} ${eDate.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })} (Tydz. ${wNum})`;
  }
  if (calView === 'miesiac') {
    return selDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }
  return selDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}
