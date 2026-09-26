/**
 * marketStatus.ts — Obliczanie statusu sesji giełdowych GPW (Warszawa) oraz USA (NYSE/NASDAQ).
 * Uwzględnia strefy czasowe Europe/Warsaw i America/New_York oraz czas letni/zimowy (DST).
 */

type MarketState = 'open' | 'pre' | 'after' | 'closed';

export interface MarketSession {
  code: 'GPW' | 'USA';
  name: string;
  state: MarketState;
  stateLabel: string;
  badgeVariant: 'success' | 'warning' | 'neutral';
  hoursLabel: string;
  nextSessionNote: string;
}

interface TimeParts {
  weekday: string;
  hour: number;
  minute: number;
  totalMinutes: number;
}

function getTimeParts(timeZone: string, now: Date): TimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return { weekday, hour, minute, totalMinutes: hour * 60 + minute };
}

const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

export function getGpwSession(now = new Date()): MarketSession {
  const { weekday, totalMinutes } = getTimeParts('Europe/Warsaw', now);
  const isWeekday = WEEKDAYS.has(weekday);

  // 08:30 = 510, 09:00 = 540, 17:00 = 1020, 17:05 = 1025
  if (isWeekday && totalMinutes >= 540 && totalMinutes < 1020) {
    return {
      code: 'GPW',
      name: 'GPW Warszawa',
      state: 'open',
      stateLabel: 'Sesja otwarta',
      badgeVariant: 'success',
      hoursLabel: '09:00 – 17:00 CET',
      nextSessionNote: 'Zamknięcie o 17:00',
    };
  }

  if (isWeekday && totalMinutes >= 510 && totalMinutes < 540) {
    return {
      code: 'GPW',
      name: 'GPW Warszawa',
      state: 'pre',
      stateLabel: 'Przedsesja',
      badgeVariant: 'warning',
      hoursLabel: '08:30 – 09:00 CET',
      nextSessionNote: 'Start notowań o 09:00',
    };
  }

  if (isWeekday && totalMinutes >= 1020 && totalMinutes < 1025) {
    return {
      code: 'GPW',
      name: 'GPW Warszawa',
      state: 'after',
      stateLabel: 'Dogrywka',
      badgeVariant: 'warning',
      hoursLabel: '17:00 – 17:05 CET',
      nextSessionNote: 'Koniec dogrywki o 17:05',
    };
  }

  const nextDay = weekday === 'Fri' || weekday === 'Sat' || weekday === 'Sun' ? 'w poniedziałek o 09:00' : 'jutro o 09:00';
  return {
    code: 'GPW',
    name: 'GPW Warszawa',
    state: 'closed',
    stateLabel: 'Zamknięte',
    badgeVariant: 'neutral',
    hoursLabel: '09:00 – 17:00 CET',
    nextSessionNote: `Otwarcie ${nextDay}`,
  };
}

export function getUsaSession(now = new Date()): MarketSession {
  const { weekday, totalMinutes } = getTimeParts('America/New_York', now);
  const isWeekday = WEEKDAYS.has(weekday);

  // NY time: 04:00 = 240, 09:30 = 570, 16:00 = 960, 20:00 = 1200
  if (isWeekday && totalMinutes >= 570 && totalMinutes < 960) {
    return {
      code: 'USA',
      name: 'NYSE / NASDAQ',
      state: 'open',
      stateLabel: 'Sesja otwarta',
      badgeVariant: 'success',
      hoursLabel: '15:30 – 22:00 CET',
      nextSessionNote: 'Zamknięcie o 22:00',
    };
  }

  if (isWeekday && totalMinutes >= 240 && totalMinutes < 570) {
    return {
      code: 'USA',
      name: 'NYSE / NASDAQ',
      state: 'pre',
      stateLabel: 'Pre-Market',
      badgeVariant: 'warning',
      hoursLabel: 'Pre: 10:00 – 15:30 CET',
      nextSessionNote: 'Główna sesja o 15:30',
    };
  }

  if (isWeekday && totalMinutes >= 960 && totalMinutes < 1200) {
    return {
      code: 'USA',
      name: 'NYSE / NASDAQ',
      state: 'after',
      stateLabel: 'After-Hours',
      badgeVariant: 'warning',
      hoursLabel: 'After: 22:00 – 02:00 CET',
      nextSessionNote: 'Koniec after-hours 02:00',
    };
  }

  const nextDay = weekday === 'Fri' || weekday === 'Sat' || weekday === 'Sun' ? 'w poniedziałek o 15:30' : 'dziś o 15:30';
  return {
    code: 'USA',
    name: 'NYSE / NASDAQ',
    state: 'closed',
    stateLabel: 'Zamknięte',
    badgeVariant: 'neutral',
    hoursLabel: '15:30 – 22:00 CET',
    nextSessionNote: `Otwarcie ${nextDay}`,
  };
}
