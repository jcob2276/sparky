import { addDays, addHours, addMinutes, addMonths, addWeeks, format, startOfDay } from 'date-fns';
import { TIMEZONE } from '../date';
import { TODO_PRIORITY_ALIASES, TODO_WEEKDAY_ALIASES } from '@vanguard/domain';

const PRIORITIES = TODO_PRIORITY_ALIASES;
const WEEKDAYS = TODO_WEEKDAY_ALIASES;

const MONTHS = [
  ['sty', 'stycznia'], ['lut', 'lutego'], ['mar', 'marca'], ['kwi', 'kwietnia'],
  ['maj', 'maja'], ['cze', 'czerwca'], ['lip', 'lipca'], ['sie', 'sierpnia'],
  ['wrz', 'wrzesnia', 'września'], ['paz', 'paź', 'pazdziernika', 'października'],
  ['lis', 'listopada'], ['gru', 'grudnia'],
];

type TokenType = 'priority' | 'date' | 'deadline' | 'duration' | 'time' | 'recurrence' | 'tag';
interface ParsedToken { type: TokenType; label: string; value: string }

const RELATIVE_CLOCK_UNITS = 'min(?:ut(?:y|ę)?)?|godz(?:in(?:y|ę)?)?|h';
const NEXT_PREFIX = 'następny|nastepny|przyszły|przyszly';

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alternatives = (groups: string[][]) => groups.flat().map(escape).join('|');
const boundary = (source: string) => new RegExp(`(^|\\s)(${source})(?=\\s|$|[,.!?])`, 'i');
const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export const TODO_NLP_HIGHLIGHT_REGEX = /((?:\b(?:p[1-4]|pilne|ważne|wazne|dzisiaj|dzis|dziś|jutro|pojutrze|za\s+(?:tydzień|tydzien|\d+\s+(?:dni|dzień|dzien|tygodnie|tygodni|miesiąc|miesiac|miesiące|miesiace|miesięcy|miesiecy))|za\s+(?:\d+\s*(?:min(?:ut(?:y|ę)?)?|godz(?:in(?:y|ę)?)?|h)|godzinę|godzine|pół\s+godziny|pol\s+godziny|kwadrans)|(?:w\s+)?(?:(?:następny|nastepny|przyszły|przyszly)\s+)?(?:poniedziałek|poniedzialek|wtorek|środa|sroda|czwartek|piątek|piatek|sobota|niedziela)|codziennie|co\s+(?:dzień|dzien|tydzień|tydzien|miesiąc|miesiac|poniedziałek|poniedzialek|wtorek|środa|sroda|czwartek|piątek|piatek|sobota|niedziela)|(?:każdy|kazdy)\s+(?:poniedziałek|poniedzialek|wtorek|środa|sroda|czwartek|piątek|piatek|sobota|niedziela)|(?:o|godz\.?|godzina)\s*\d{1,2}(?:[:.]\d{2})?|\d{1,2}:\d{2}|rano|w\s+południe|w\s+poludnie|wieczorem|w\s+nocy|\d{1,2}[./-]\d{1,2}(?:[./-]20\d{2})?)\b)|(?:!p[1-4]\b)|(?:[#@][\p{L}\d_-]+))/giu;

function consume(text: string, match: RegExpMatchArray): string {
  if (match.index == null) return text;
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

function validDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

function futureMonthDay(now: Date, month: number, day: number, year?: number): Date | null {
  const today = startOfDay(now);
  if (year != null) return validDate(year, month, day);
  const current = validDate(today.getFullYear(), month, day);
  if (!current) return null;
  return current < today ? validDate(today.getFullYear() + 1, month, day) : current;
}

function nextWeekday(now: Date, weekday: number): Date {
  const today = startOfDay(now);
  return addDays(today, (weekday - today.getDay() + 7) % 7 || 7);
}

// `date` holds Warsaw wall-clock fields in local components, so format it without a timezone shift.
const dateLabelFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });
function dateLabel(date: Date): string {
  return dateLabelFormatter.format(date);
}

const warsawPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** An instant expressed as a Date whose local fields equal the Europe/Warsaw wall clock. */
export function warsawWallClock(instant: Date = new Date()): Date {
  const parts: Record<string, number> = {};
  for (const part of warsawPartsFormatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function normalizeName(value: string): string {
  return value.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[\s_-]+/g, '');
}

/** Maps a `#tag` onto a section by name (exact match, else a unique prefix of 3+ chars). */
export function matchSectionByTag(
  tags: string[],
  sections: ReadonlyArray<{ id: string; name: string }>,
): { sectionId: string | null; sectionName: string | null; tags: string[] } {
  const named = sections.map((section) => ({ ...section, key: normalizeName(section.name) }));
  for (const tag of tags) {
    if (tag.startsWith('@')) continue;
    const key = normalizeName(tag);
    if (!key) continue;
    const exact = named.find((section) => section.key === key);
    const prefixes = key.length >= 3 ? named.filter((section) => section.key.startsWith(key)) : [];
    const hit = exact ?? (prefixes.length === 1 ? prefixes[0] : null);
    if (hit) return { sectionId: hit.id, sectionName: hit.name, tags: tags.filter((item) => item !== tag) };
  }
  return { sectionId: null, sectionName: null, tags };
}

/**
 * Parses Polish natural language. `nowOverride` is interpreted as a Warsaw wall-clock Date
 * (tests); by default the current Europe/Warsaw wall clock is used.
 */
export function parseTodoQuickInput(input: string | null | undefined, nowOverride?: Date) {
  const now = nowOverride ?? warsawWallClock();
  let title = String(input || '');
  let dateExplicit = false;
  const tokens: ParsedToken[] = [];
  const has = (type: TokenType) => tokens.some((token) => token.type === type);
  const token = (type: TokenType) => tokens.find((item) => item.type === type)?.value || null;
  const add = (type: TokenType, label: string, value: string) => tokens.push({ type, label, value });

  const priority = title.match(boundary('!?p[1-4]|!high|!low'))
    || title.match(/(^|\s)(pilne|ważne|wazne)(?=\s*$)/i);
  if (priority) {
    const rawPriority = priority[2].toLocaleLowerCase('pl-PL');
    const meta = PRIORITIES[rawPriority] ?? PRIORITIES[rawPriority.replace(/^!/, '')];
    add('priority', meta.label, meta.value);
    title = consume(title, priority);
  }

  const deadline = title.match(/(^|\s)do\s+(jutra|pojutrza|poniedziałku|poniedzialku|wtorku|środy|srody|czwartku|piątku|piatku|soboty|niedzieli|[0-3]?\d[./-][01]?\d(?:[./-]20\d{2})?)(?=\s|$|[,.!?])/i);
  if (deadline) {
    const raw = deadline[2].toLocaleLowerCase('pl-PL');
    const inflectedWeekdays: Record<string, number> = {
      niedzieli: 0, 'poniedziałku': 1, poniedzialku: 1, wtorku: 2,
      'środy': 3, srody: 3, czwartku: 4, 'piątku': 5, piatku: 5, soboty: 6,
    };
    let value: Date | null = raw === 'jutra' ? addDays(now, 1) : raw === 'pojutrza' ? addDays(now, 2) : null;
    if (raw in inflectedWeekdays) value = nextWeekday(now, inflectedWeekdays[raw]);
    const numeric = raw.match(/^([0-3]?\d)[./-]([01]?\d)(?:[./-](20\d{2}))?$/);
    if (numeric) value = futureMonthDay(now, Number(numeric[2]) - 1, Number(numeric[1]), numeric[3] ? Number(numeric[3]) : undefined);
    if (value) {
      add('deadline', `Do ${dateLabel(value)}`, toDateKey(value));
      title = consume(title, deadline);
    }
  }

  const recurringWeekday = title.match(boundary(`(?:co|każdy|kazdy|w\\s+każdy|w\\s+kazdy)\\s+(${alternatives(WEEKDAYS)})`));
  let recurrence: string | null = null;
  if (recurringWeekday) {
    const weekdayWord = recurringWeekday[3].toLocaleLowerCase('pl-PL');
    const weekday = WEEKDAYS.findIndex((aliases) => aliases.includes(weekdayWord));
    const date = nextWeekday(now, weekday);
    recurrence = 'weekly';
    add('recurrence', `Co ${weekdayWord}`, recurrence);
    add('date', dateLabel(date), toDateKey(date));
    dateExplicit = true;
    title = consume(title, recurringWeekday);
  } else {
    const recurring = title.match(boundary('codziennie|co\\s+dzień|co\\s+dzien|co\\s+tydzień|co\\s+tydzien|co\\s+miesiąc|co\\s+miesiac'));
    if (recurring) {
      const raw = recurring[2].toLocaleLowerCase('pl-PL');
      recurrence = raw.includes('tydzie') ? 'weekly' : raw.includes('miesi') ? 'monthly' : 'daily';
      add('recurrence', recurrence === 'daily' ? 'Codziennie' : recurrence === 'weekly' ? 'Co tydzień' : 'Co miesiąc', recurrence);
      title = consume(title, recurring);
    }
  }

  // "za 30 minut", "za 2h", "za godzinę", "za pół godziny", "za kwadrans" -> date + clock time.
  const relativeClock = title.match(boundary(`za\\s+(?:(\\d+)\\s*(${RELATIVE_CLOCK_UNITS})|(godzinę|godzine|pół\\s+godziny|pol\\s+godziny|kwadrans))`));
  if (relativeClock) {
    const amount = Number(relativeClock[3]);
    const unit = (relativeClock[4] || '').toLocaleLowerCase('pl-PL');
    const word = (relativeClock[5] || '').toLocaleLowerCase('pl-PL');
    const target = word
      ? addMinutes(now, word.startsWith('godzin') ? 60 : word === 'kwadrans' ? 15 : 30)
      : /^(godz|h)/.test(unit) ? addHours(now, amount) : addMinutes(now, amount);
    add('date', dateLabel(target), toDateKey(target));
    dateExplicit = true;
    add('time', format(target, 'HH:mm'), format(target, 'HH:mm'));
    title = consume(title, relativeClock);
  }

  if (!has('date')) {
    const relative = title.match(boundary('dzisiaj|dzis|dziś|jutro|pojutrze|za\\s+tydzień|za\\s+tydzien|za\\s+(\\d+)\\s+(dni|dzień|dzien|tygodnie|tygodni|miesiąc|miesiac|miesiące|miesiace|miesięcy|miesiecy)'));
    if (relative) {
      const raw = relative[2].toLocaleLowerCase('pl-PL');
      const amount = Number(relative[3] || 1);
      const date = raw === 'jutro' ? addDays(now, 1)
        : raw === 'pojutrze' ? addDays(now, 2)
        : raw.includes('tydzie') || raw.includes('tygod') ? addWeeks(now, amount)
        : raw.includes('miesi') ? addMonths(now, amount)
        : raw.startsWith('za') ? addDays(now, amount)
        : now;
      add('date', dateLabel(date), toDateKey(date));
      dateExplicit = true;
      title = consume(title, relative);
    }
  }

  if (!has('date')) {
    const weekday = title.match(boundary(`(?:w\\s+)?(?:(?:${NEXT_PREFIX})\\s+)?(?:${alternatives(WEEKDAYS)})`));
    if (weekday) {
      const words = weekday[2].trim().toLocaleLowerCase('pl-PL').split(/\s+/);
      const raw = words[words.length - 1];
      const index = WEEKDAYS.findIndex((aliases) => aliases.includes(raw));
      let date = nextWeekday(now, index);
      // "następny piątek" means the one in the following week, not later this week.
      const isNext = new RegExp(`^(${NEXT_PREFIX})$`).test(words[words.length - 2] ?? '');
      const daysToMonday = (1 - startOfDay(now).getDay() + 7) % 7 || 7;
      if (isNext && date < addDays(startOfDay(now), daysToMonday)) date = addDays(date, 7);
      add('date', dateLabel(date), toDateKey(date));
      dateExplicit = true;
      title = consume(title, weekday);
    }
  }

  if (!has('date')) {
    const namedDate = title.match(new RegExp(`(^|\\s)([0-3]?\\d)\\s+(${alternatives(MONTHS)})(?:\\s+(20\\d{2}))?(?=\\s|$|[,.!?])`, 'i'));
    if (namedDate) {
      const month = MONTHS.findIndex((aliases) => aliases.includes(namedDate[3].toLocaleLowerCase('pl-PL')));
      const date = futureMonthDay(now, month, Number(namedDate[2]), namedDate[4] ? Number(namedDate[4]) : undefined);
      if (date) { add('date', dateLabel(date), toDateKey(date)); dateExplicit = true; title = consume(title, namedDate); }
    }
  }

  if (!has('date')) {
    const numeric = title.match(/(^|\s)([0-3]?\d)[./-]([01]?\d)(?:[./-](20\d{2}))?(?=\s|$|[,.!?])/);
    if (numeric) {
      const date = futureMonthDay(now, Number(numeric[3]) - 1, Number(numeric[2]), numeric[4] ? Number(numeric[4]) : undefined);
      if (date) { add('date', dateLabel(date), toDateKey(date)); dateExplicit = true; title = consume(title, numeric); }
    }
  }

  // "o 15", "godz. 9.30", "15:00", "na 15:00" ("na 15" alone is not a time: "bilet na 15 osób").
  const time = title.match(/(^|\s)(?:(?:o|godz\.?|godzina)\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?|(?:na\s*)?([01]?\d|2[0-3]):([0-5]\d))(?=\s|$|[,.!?])/i);
  const period = !time && title.match(boundary('rano|w\\s+południe|w\\s+poludnie|wieczorem|w\\s+nocy'));
  if (time) {
    const hours = time[2] ?? time[4];
    const minutes = time[3] ?? time[5];
    const value = `${String(Number(hours)).padStart(2, '0')}:${String(Number(minutes || 0)).padStart(2, '0')}`;
    add('time', value, value);
    title = consume(title, time);
  } else if (period) {
    const raw = period[2].toLocaleLowerCase('pl-PL');
    const value = raw.includes('połud') || raw.includes('polud') ? '12:00' : raw.includes('wiecz') ? '18:00' : raw.includes('nocy') ? '22:00' : '08:00';
    add('time', value, value);
    title = consume(title, period);
  }
  if (has('time') && !has('date')) {
    // A bare time that already passed today means tomorrow ("o 8" typed at 15:00).
    const [hours, minutes] = (token('time') as string).split(':').map(Number);
    const passed = hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
    add('date', passed ? 'Jutro' : 'Dzisiaj', toDateKey(passed ? addDays(now, 1) : now));
  }

  const duration = title.match(/(^|\s)(?:(\d+(?:[.,]\d+)?)\s*(?:h|godz(?:in(?:y|ę)?)?)(?:\s*(\d+)\s*m(?:in(?:ut)?)?)?|(\d+)\s*m(?:in(?:ut(?:y|ę)?)?)?)(?=\s|$|[,.!?])/i);
  if (duration) {
    const minutes = duration[2] ? Math.round(Number(duration[2].replace(',', '.')) * 60) + Number(duration[3] || 0) : Number(duration[4]);
    if (minutes >= 5 && minutes <= 1440) {
      add('duration', minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} godz.${minutes % 60 ? ` ${minutes % 60} min` : ''}`, String(minutes));
      title = consume(title, duration);
    }
  }

  // "#sekcja" / "#tag" and "@kontekst" (contexts keep their "@" so they never collide with sections).
  const tagMatches = [...title.matchAll(/(^|\s)([#@])([\p{L}\d_-]+)(?=\s|$|[,.!?])/giu)];
  for (const match of tagMatches) {
    add('tag', `${match[2]}${match[3]}`, `${match[2] === '@' ? '@' : ''}${match[3].toLocaleLowerCase('pl-PL')}`);
  }
  for (const match of [...tagMatches].reverse()) title = consume(title, match);

  if (recurrence && !has('date')) add('date', 'Dzisiaj', toDateKey(now));

  return {
    title: cleanTitle(title),
    priority: token('priority'),
    due_date: token('date'),
    deadline_date: token('deadline'),
    scheduled_time: token('time'),
    duration_minutes: token('duration') ? Number(token('duration')) : null,
    recurrence,
    date_explicit: dateExplicit,
    tags: tokens.filter((item) => item.type === 'tag').map((item) => item.value),
    tokens,
  };
}
