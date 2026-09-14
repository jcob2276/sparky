import { daysBefore } from './desktopMath';

export interface LenieLogRow {
  date: string;
  logged_at?: string | null; // ISO timestamp of log in Warsaw time
  final_stimulus?: string | null;
  context_note?: string | null;
}

function pluralWpadki(count: number): string {
  if (count === 1) return '1 wpadka';
  const rem10 = count % 10;
  const rem100 = count % 100;
  if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) {
    return `${count} wpadki`;
  }
  return `${count} wpadek`;
}

export function computeLenieInsight(logs: LenieLogRow[]) {
  if (!logs?.length) return null;
  const DOW_PL_LOCAL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const recent = logs.slice(0, 15);
  const total30 = logs.filter((l) => l.date >= daysBefore(30)).length;
  const total60 = logs.filter((l) => l.date >= daysBefore(60) && l.date < daysBefore(30)).length;

  // Day-of-week peak
  const dowCount: Record<number, number> = {};
  for (const l of logs) {
    const d = new Date(l.date + 'T12:00:00Z').getUTCDay();
    dowCount[d] = (dowCount[d] || 0) + 1;
  }
  const sorted = Object.entries(dowCount).sort((a, b) => b[1] - a[1]);
  const peakDay = sorted[0] ? DOW_PL_LOCAL[+sorted[0][0]] : null;
  const peakN = sorted[0] ? sorted[0][1] : 0;

  // Top trigger keywords
  const STOP = new Set(
    'i w z na do sie to ze a nie jest bylo mi jak po przez od o ich je co byl ta te ten ta to mnie bo ale go mu tak juz czy wiec az no wtedy kiedy wlaczyl wlaczalem mialem bylo wygenerowanych wygenerowane zdjec zdjecia obrazki'.split(
      ' '
    )
  );
  const wc: Record<string, number> = {};
  const entryCount: Record<string, number> = {};
  const entriesWithText = recent.filter((l) => l.final_stimulus || l.context_note).length;

  for (const l of recent) {
    const text = [l.context_note || '', l.final_stimulus || ''].join(' ');
    const seen = new Set<string>();
    for (const w of text.toLowerCase().split(/\W+/)) {
      if (w.length > 3 && !STOP.has(w) && !seen.has(w)) {
        wc[w] = (wc[w] || 0) + 1;
        entryCount[w] = (entryCount[w] || 0) + 1;
        seen.add(w);
      }
    }
  }
  const noiseThreshold = Math.max(2, Math.ceil(entriesWithText * 0.7));
  const topW = Object.entries(entryCount)
    .filter(([, c]) => c >= 2 && c < noiseThreshold)
    .sort((a, b) => (wc[b[0]] || 0) - (wc[a[0]] || 0))
    .slice(0, 3)
    .map(([w]) => w);

  // Trend
  const trend = total60 > 0 ? Math.round(((total30 - total60) / total60) * 100) : null;

  const parts = [];
  if (trend !== null && Math.abs(trend) >= 20) {
    parts.push(`${trend > 0 ? 'Wzrost' : 'Spadek'} o ${Math.abs(trend)}% vs poprzedni miesiąc (${pluralWpadki(total30)} vs ${total60} poprzednio).`);
  } else if (total30 > 0) {
    parts.push(
      `${pluralWpadki(total30)} w ostatnich 30 dniach${
        total60 > 0 ? ` — stabilna częstotliwość (${total60} poprzednio)` : ''
      }.`
    );
  }

  if (peakDay && peakN > 1) {
    parts.push(`Najczęstszy dzień: ${peakDay} (${peakN}/${logs.length} w historii).`);
  }

  if (topW.length) {
    parts.push(`Dominujące triggery: ${topW.join(', ')}.`);
  }

  if (!parts.length) return 'Za mało danych do wyciągnięcia wzorca.';
  return parts.join(' ');
}

// ─── Extended Hour & Behavioral Pattern Analysis ──────────────────────────────

export interface LenieHour24Slot {
  hour: number;
  label: string; // "00", "01", ..., "23"
  count: number;
  pct: number;
  isPeak: boolean;
  isDangerZone: boolean; // 20..01 or 13..17
}

export interface LeniePatternInsight {
  title: string;
  badge: string;
  badgeType: 'danger' | 'warning' | 'info';
  description: string;
}

export interface LenieRecentLogDisplay {
  date: string;
  timeStr: string | null;
  stimulus: string;
  context: string;
}

export interface LenieStatsResult {
  /** 24-hour histogram */
  hourly24: LenieHour24Slot[];
  /** Top hours with most slips, e.g. "20:00 (18×)" */
  topHoursText: string;
  /** Percentage of all events in the night critical window (20:00 - 01:59) */
  nightWindowPct: number;
  nightWindowCount: number;
  /** Percentage in afternoon window (13:00 - 17:59) */
  afternoonWindowPct: number;
  afternoonWindowCount: number;
  /** Total ejaculations in last 30 days (counting "+" multi-events) */
  totalEjaculations30: number;
  avgPerDay: number;
  maxPerDay: number;
  multiDayCount: number;
  /** Specific behavioral pattern rules found in the data */
  patterns: LeniePatternInsight[];
  /** Recent formatted logs with exact times */
  recentLogs: LenieRecentLogDisplay[];
}

export function warsawHourAndMinute(isoStr: string): { hour: number; minute: number; timeStr: string } {
  const d = new Date(isoStr);
  const parts = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const hStr = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mStr = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return {
    hour: parseInt(hStr, 10),
    minute: parseInt(mStr, 10),
    timeStr: `${hStr}:${mStr}`,
  };
}

export function computeLenieStats(logs: LenieLogRow[]): LenieStatsResult {
  const recent30 = logs.filter((l) => l.date >= daysBefore(30));

  // 1. Frequency in 30 days
  const perDayCounts = recent30.map((l) =>
    l.final_stimulus ? l.final_stimulus.split(' + ').length : 1
  );
  const totalEjaculations30 = perDayCounts.reduce((a, b) => a + b, 0);
  const avgPerDay = recent30.length > 0
    ? Math.round((totalEjaculations30 / recent30.length) * 10) / 10
    : 0;
  const maxPerDay = perDayCounts.length > 0 ? Math.max(...perDayCounts) : 0;
  const multiDayCount = perDayCounts.filter((c) => c > 1).length;

  // 2. 24-hour histogram from all available logs
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));

  let totalWithHours = 0;
  let nightWindowCount = 0; // 20:00 - 01:59
  let afternoonWindowCount = 0; // 13:00 - 17:59

  const recentLogs: LenieRecentLogDisplay[] = [];

  for (const l of logs) {
    let timeStr: string | null = null;
    if (l.logged_at) {
      try {
        const { hour, timeStr: ts } = warsawHourAndMinute(l.logged_at);
        timeStr = ts;
        hourCounts[hour].count++;
        totalWithHours++;

        if (hour >= 20 || hour <= 1) nightWindowCount++;
        if (hour >= 13 && hour <= 17) afternoonWindowCount++;
      } catch {
        // ignore malformed
      }
    }

    if (recentLogs.length < 10) {
      recentLogs.push({
        date: l.date,
        timeStr,
        stimulus: l.final_stimulus || 'Brak wpisu',
        context: l.context_note || '',
      });
    }
  }

  const maxHourCount = Math.max(...hourCounts.map((h) => h.count), 1);
  const hourly24: LenieHour24Slot[] = hourCounts.map((h) => {
    const isDangerZone = (h.hour >= 20 || h.hour <= 1) || (h.hour >= 13 && h.hour <= 17);
    const pct = totalWithHours > 0 ? Math.round((h.count / totalWithHours) * 100) : 0;
    return {
      hour: h.hour,
      label: String(h.hour).padStart(2, '0'),
      count: h.count,
      pct,
      isPeak: h.count >= 8 && h.count >= maxHourCount * 0.7,
      isDangerZone,
    };
  });

  const nightWindowPct = totalWithHours > 0 ? Math.round((nightWindowCount / totalWithHours) * 100) : 0;
  const afternoonWindowPct = totalWithHours > 0 ? Math.round((afternoonWindowCount / totalWithHours) * 100) : 0;

  const topSortedHours = [...hourCounts]
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((h) => `${String(h.hour).padStart(2, '0')}:00 (${h.count}×)`);

  const topHoursText = topSortedHours.join(', ');

  // 3. Behavioral Patterns synthesis
  const patterns: LeniePatternInsight[] = [
    {
      title: 'Strefa Ciemności (20:00 – 01:00)',
      badge: `${nightWindowPct}% incydentów`,
      badgeType: 'danger',
      description: 'Zdecydowana większość wpadek ma miejsce w łóżku/przed snem. Szczyty o 20:00 oraz 23:00–00:00.',
    },
    {
      title: 'Zjazd Popołudniowy (13:00 – 17:00)',
      badge: `${afternoonWindowPct}% incydentów`,
      badgeType: 'warning',
      description: 'Drugie okno podatności: spadek energii w pracy/nauce, leżenie w łóżku i sięganie po telefon.',
    },
    {
      title: 'Sekwencja Eskalacji: Pinterest → Porno',
      badge: 'Główny Funnel',
      badgeType: 'danger',
      description: 'Przeglądanie zdjęć na Pinterest działa jak katalizator — eskalacja do porno następuje w ciągu kilku minut.',
    },
    {
      title: 'Bezpieczny Poranek (02:00 – 11:00)',
      badge: 'Strefa Czysta',
      badgeType: 'info',
      description: 'Poziom ryzyka rano jest minimalny. Najważniejsze punkty obrony to popołudnie i wieczór.',
    },
  ];

  return {
    hourly24,
    topHoursText,
    nightWindowPct,
    nightWindowCount,
    afternoonWindowPct,
    afternoonWindowCount,
    totalEjaculations30,
    avgPerDay,
    maxPerDay,
    multiDayCount,
    patterns,
    recentLogs,
  };
}
