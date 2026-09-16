import {
  TODO_TODAY_ALIASES,
  TODO_TOMORROW_ALIASES,
  TODO_DAY_AFTER_ALIASES,
  TODO_WEEKDAY_ALIASES,
  resolvePriorityAlias,
  type TodoPriority,
} from "@vanguard/domain";

export function normalizePriority(value: unknown): TodoPriority {
  if (value === 'medium') return 'normal';
  return value === 'urgent' || value === 'high' || value === 'normal' || value === 'low'
    ? value
    : 'normal';
}

function escapeRegex(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deterministicTodoParse(raw: string, todayStr: string): {
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: TodoPriority;
  notes: string;
} | null {
  let text = raw.trim();
  if (!text) return null;

  if (/\b(jeśli|jeżeli|zanim|przed|po|gdy|kiedy|chyba|ale|wcześniej|pozniej|później|potem|wtedy)\b/i.test(text)) {
    return null;
  }

  let priority: TodoPriority = 'normal';
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  const notes = '';

  const priorityMatch = text.match(/\b(p[1-4]|!high|!low|pilne|niski)\b/i);
  if (priorityMatch) {
    const resolved = resolvePriorityAlias(priorityMatch[1]);
    if (resolved) {
      priority = resolved.value;
      text = text.replace(priorityMatch[0], '');
    }
  }

  const getNextDayOfWeek = (dayIndex: number): string => {
    const today = new Date(todayStr + 'T12:00:00Z');
    let diff = dayIndex - today.getUTCDay();
    if (diff <= 0) diff += 7;
    today.setUTCDate(today.getUTCDate() + diff);
    return today.toISOString().split('T')[0];
  };

  const tomorrowStr = (() => {
    const d = new Date(todayStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const pojutrzeStr = (() => {
    const d = new Date(todayStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 2);
    return d.toISOString().split('T')[0];
  })();

  const relativeRegex = /\bza\s+(\d+)\s*(minut|min|godzin|h|dni|dniach)\b/i;
  const relMatch = text.match(relativeRegex);
  if (relMatch) {
    const num = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const d = new Date();
    if (unit.startsWith('min')) {
      d.setMinutes(d.getMinutes() + num);
    } else if (unit.startsWith('godz') || unit === 'h') {
      d.setHours(d.getHours() + num);
    } else if (unit.startsWith('dn')) {
      d.setDate(d.getDate() + num);
    }
    const warsawStr = d.toLocaleString('sv', { timeZone: 'Europe/Warsaw' });
    dueDate = warsawStr.split(' ')[0];
    dueTime = warsawStr.split(' ')[1].substring(0, 5);
    text = text.replace(relativeRegex, '');
  }

  const todayPattern = TODO_TODAY_ALIASES.map(escapeRegex).join('|');
  const todayRegex = new RegExp(`\\b(${todayPattern})\\b`, 'i');
  if (todayRegex.test(text)) {
    dueDate = todayStr;
    text = text.replace(todayRegex, '');
  }

  const tomorrowPattern = TODO_TOMORROW_ALIASES.map(escapeRegex).join('|');
  const tomorrowRegex = new RegExp(`\\b(${tomorrowPattern})\\b`, 'i');
  if (tomorrowRegex.test(text)) {
    dueDate = tomorrowStr;
    text = text.replace(tomorrowRegex, '');
  }

  const dayAfterPattern = TODO_DAY_AFTER_ALIASES.map(escapeRegex).join('|');
  const pojutrzeRegex = new RegExp(`\\b(${dayAfterPattern})\\b`, 'i');
  if (pojutrzeRegex.test(text)) {
    dueDate = pojutrzeStr;
    text = text.replace(pojutrzeRegex, '');
  }

  for (let dayIndex = 0; dayIndex < TODO_WEEKDAY_ALIASES.length; dayIndex++) {
    const aliases = TODO_WEEKDAY_ALIASES[dayIndex];
    const anyAlias = aliases.map(escapeRegex).join('|');
    const groupRegex = new RegExp(`\\bw\\s+(?:${anyAlias})\\w*|\\b(?:${anyAlias})\\w*`, 'i');
    if (groupRegex.test(text)) {
      dueDate = getNextDayOfWeek(dayIndex);
      text = text.replace(groupRegex, '');
      break;
    }
  }

  const timeRegex = /\b(o\s+)?(\d{1,2}):(\d{2})\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const hr = timeMatch[2].padStart(2, '0');
    const min = timeMatch[3];
    dueTime = `${hr}:${min}`;
    text = text.replace(timeRegex, '');
  } else {
    const simpleTimeRegex = /\bo\s+(\d{1,2})\b/i;
    const simpleTimeMatch = text.match(simpleTimeRegex);
    if (simpleTimeMatch) {
      const hr = simpleTimeMatch[1].padStart(2, '0');
      dueTime = `${hr}:00`;
      text = text.replace(simpleTimeRegex, '');
    }
  }

  text = text.replace(/\+/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  return {
    title: text,
    due_date: dueDate,
    due_time: dueTime,
    priority,
    notes,
  };
}
