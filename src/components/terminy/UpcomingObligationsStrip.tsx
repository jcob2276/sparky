import { useMemo } from 'react';
import { getTodayWarsaw, type LifeObligationKind } from '@vanguard/domain';
import { Cake, Car, CheckCircle2, CreditCard, FileText, HeartPulse, Home, CalendarClock } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { useLifeObligations } from '../../lib/lifeObligationsApi';
import { formatLongDateWarsaw } from '../../lib/date';
import { countdownLabel, deriveAll } from './terminyDerived';
import { nextQuietRow, upcomingRows } from './upcoming';
import { useCompleteObligation } from './useCompleteObligation';

const KIND_ICON: Record<LifeObligationKind, typeof Cake> = {
  people: Cake, vehicle: Car, document: FileText, home: Home, finance: CreditCard, health_admin: HeartPulse,
};

interface Props {
  userId: string | undefined;
  onNavigateToTerminy: () => void;
}

/**
 * Pod czerwonym banerem (dziś i jutro): terminy, które weszły w okno swoich przypomnień, zanim zrobi się pilnie.
 * Gdy nic nie jest w oknie, jedna spokojna linia o najbliższym terminie.
 */
export function UpcomingObligationsStrip({ userId, onNavigateToTerminy }: Props) {
  const today = getTodayWarsaw();
  const { data: items = [] } = useLifeObligations(userId);
  const { complete, completedIds, pending } = useCompleteObligation(userId);
  const { rows, quiet } = useMemo(() => {
    const all = deriveAll(items, today).filter((r) => !completedIds.has(r.item.id));
    return { rows: upcomingRows(all), quiet: nextQuietRow(all) };
  }, [items, today, completedIds]);

  if (rows.length === 0 && !quiet) return null;

  return (
    <div className="space-y-2">
      {rows.map(({ row, level }) => {
        const Icon = KIND_ICON[row.item.kind] ?? CalendarClock;
        const soon = level === 'soon';
        return (
          <div key={row.item.id} className={`flex items-center gap-3 rounded-[var(--radius-grouped)] border p-3 ${soon ? 'border-warning/40 bg-warning/10' : 'border-border-custom bg-surface/60'}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${soon ? 'bg-warning/20 text-warning' : 'bg-surface-3 text-text-muted'}`}>
              <Icon size={17} />
            </div>
            <Pressable type="button" onClick={onNavigateToTerminy} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-text-primary">
                {row.item.title}{row.item.related_name ? ` (${row.item.related_name})` : ''}
              </p>
              <p className="text-xs text-text-secondary">{countdownLabel(row.daysLeft)} · {formatLongDateWarsaw(row.nextDate)}</p>
            </Pressable>
            <Pressable
              type="button"
              onClick={() => void complete(row)}
              disabled={pending}
              aria-label={`Zrealizowano: ${row.item.title}`}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-3 px-3 text-xs font-semibold text-text-primary active:scale-95 disabled:pointer-events-none"
            >
              <CheckCircle2 size={14} /> Zrobione
            </Pressable>
          </div>
        );
      })}
      {rows.length === 0 && quiet && (
        <Pressable type="button" onClick={onNavigateToTerminy} className="flex w-full items-center gap-2 px-1 text-left text-xs text-text-muted">
          <CalendarClock size={13} className="shrink-0" />
          <span className="truncate">
            Najbliższy termin: {quiet.item.title}{quiet.item.related_name ? ` (${quiet.item.related_name})` : ''} za {quiet.daysLeft} dni
          </span>
        </Pressable>
      )}
    </div>
  );
}
