import {
  daysUntil,
  nextOccurrence,
  type LifeObligationKind,
} from '@vanguard/domain';
import type { LifeObligation } from '../../lib/lifeObligationsApi';
import { downloadBlob } from '../../lib/download';

export type UrgencyBucket = 'today' | 'week' | 'month' | 'later';

export interface DerivedObligation {
  item: LifeObligation;
  nextDate: string;
  daysLeft: number;
  bucket: UrgencyBucket;
  /** 0–1 progress toward occurrence; 1 = today or overdue framing as full. */
  ringProgress: number;
}

export const URGENCY_BUCKET_LABELS: Record<UrgencyBucket, string> = {
  today: 'Dziś',
  week: '7 dni',
  month: '30 dni',
  later: 'Później',
};

const RING_HORIZON_DAYS = 90;

export function urgencyBucket(daysLeft: number): UrgencyBucket {
  if (daysLeft <= 0) return 'today';
  if (daysLeft <= 7) return 'week';
  if (daysLeft <= 30) return 'month';
  return 'later';
}

export function ringProgress(daysLeft: number, horizonDays = RING_HORIZON_DAYS): number {
  if (daysLeft <= 0) return 1;
  if (daysLeft >= horizonDays) return 0.08;
  return 1 - daysLeft / horizonDays;
}

export function deriveObligation(item: LifeObligation, today: string): DerivedObligation | null {
  let nextDate: string | null;
  
  if (item.recurrence === 'once') {
    nextDate = item.anchor_date;
  } else if (item.kind === 'people') {
    nextDate = nextOccurrence(item.anchor_date, item.recurrence, today);
  } else {
    nextDate = item.anchor_date;
  }

  if (!nextDate) return null;
  const daysLeft = daysUntil(nextDate, today);
  return {
    item,
    nextDate,
    daysLeft,
    bucket: urgencyBucket(daysLeft),
    ringProgress: ringProgress(daysLeft),
  };
}

export function deriveAll(items: LifeObligation[], today: string): DerivedObligation[] {
  return items
    .map((item) => deriveObligation(item, today))
    .filter((row): row is DerivedObligation => row != null)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.nextDate.localeCompare(b.nextDate));
}

export function bucketMap(rows: DerivedObligation[]): Record<UrgencyBucket, DerivedObligation[]> {
  const map: Record<UrgencyBucket, DerivedObligation[]> = {
    today: [],
    week: [],
    month: [],
    later: [],
  };
  for (const row of rows) map[row.bucket].push(row);
  return map;
}

export function filterByKind(rows: DerivedObligation[], kind: LifeObligationKind): DerivedObligation[] {
  return rows.filter((row) => row.item.kind === kind);
}

export function initialsFrom(title: string, relatedName: string | null): string {
  const source = (relatedName || title).trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function countdownLabel(daysLeft: number): string {
  if (daysLeft < 0) return 'Przeterminowany';
  if (daysLeft === 0) return 'Dziś';
  if (daysLeft === 1) return 'Jutro';
  return `${daysLeft} dni`;
}

export function monthsAheadDate(today: string, months: number): string {
  const [y, m, d] = today.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return today;
  const total = m - 1 + months;
  const ny = y + Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
}

export function isYmd(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export {
  type StarterTemplate,
  STARTER_TEMPLATES,
  templatesForKind,
} from './terminyTemplates';

export function getMonthlyCounts(rows: DerivedObligation[]): Record<number, number> {
  const counts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };
  for (const row of rows) {
    if (row.nextDate) {
      const monthNum = parseInt(row.nextDate.split('-')[1], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        counts[monthNum] = (counts[monthNum] || 0) + 1;
      }
    }
  }
  return counts;
}

export function buildICSContent(rows: DerivedObligation[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sparky OS//Terminy//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const row of rows) {
    const d = row.nextDate.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:termin-${row.item.id}@sparky.local`,
      `DTSTAMP:${d}T090000Z`,
      `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${row.item.title}${row.item.related_name ? ` (${row.item.related_name})` : ''}`,
      `DESCRIPTION:${(row.item.notes || 'Termin ze Sparky').replace(/\n/g, '\\n')}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function downloadICSFile(filename: string, icsContent: string): Promise<void> {
  const safeFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  await downloadBlob(blob, safeFilename);
}

