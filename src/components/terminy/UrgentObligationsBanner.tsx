import { useMemo } from 'react';
import { getTodayWarsaw, nextOccurrence, shiftDateStr } from '@vanguard/domain';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { formatLongDateWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import {
  useLifeObligations,
  useLifeObligationMutations,
} from '../../lib/lifeObligationsApi';
import { deriveAll, type DerivedObligation } from './terminyDerived';

interface Props {
  userId: string | undefined;
  onNavigateToTerminy: () => void;
}

export function UrgentObligationsBanner({ userId, onNavigateToTerminy }: Props) {
  const today = getTodayWarsaw();
  const { data: items = [] } = useLifeObligations(userId);
  const { remove, update } = useLifeObligationMutations(userId);

  const urgentRows = useMemo(() => {
    const all = deriveAll(items, today);
    return all.filter((r) => r.daysLeft <= 1);
  }, [items, today]);

  if (urgentRows.length === 0) return null;

  const topUrgent = urgentRows[0];

  const handleComplete = async (row: DerivedObligation) => {
    try {
      if (row.item.recurrence === 'once') {
        await remove.mutateAsync(row.item.id);
        notify(`Zrealizowano: „${row.item.title}”`, 'success');
      } else {
        const currentOccurrence = row.nextDate;
        const dayAfter = shiftDateStr(currentOccurrence, 1);
        const nextDate = nextOccurrence(row.item.anchor_date, row.item.recurrence, dayAfter) ?? dayAfter;
        await update.mutateAsync({ id: row.item.id, anchor_date: nextDate, sent_reminders: [] });
        notify(`Zrealizowano! Odnowiono termin „${row.item.title}” na ${formatLongDateWarsaw(nextDate)}`, 'success');
      }
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Błąd aktualizacji', 'error');
    }
  };

  const isOverdue = topUrgent.daysLeft < 0;
  const isToday = topUrgent.daysLeft === 0;

  let bannerMessage = '⚠️ Jutro upływa termin!';
  if (isOverdue) bannerMessage = '🚨 Termin minął!';
  else if (isToday) bannerMessage = '🚨 Dzisiaj upływa termin!';

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-danger/30 bg-gradient-to-r from-danger/15 via-surface-solid to-surface-2 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger ring-1 ring-danger/40 mt-0.5 sm:mt-0">
            <AlertTriangle size={18} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-danger">
                {bannerMessage}
              </span>
              {urgentRows.length > 1 && (
                <span className="rounded-full bg-danger/20 px-2 py-0.5 text-3xs font-semibold text-danger">
                  +{urgentRows.length - 1} więcej
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold tracking-tight text-text-primary truncate mt-0.5">
              {topUrgent.item.title}
              {topUrgent.item.related_name ? ` (${topUrgent.item.related_name})` : ''}
            </h4>

            <p className="text-xs text-text-secondary mt-0.5">
              Termin: <strong className="text-text-primary">{formatLongDateWarsaw(topUrgent.nextDate)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Pressable
            onClick={() => void handleComplete(topUrgent)}
            className="flex items-center gap-1.5 rounded-full bg-danger text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 hover:opacity-90"
          >
            <CheckCircle2 size={14} strokeWidth={2.2} />
            <span>Zrealizowano</span>
          </Pressable>

          <Pressable
            onClick={onNavigateToTerminy}
            className="flex items-center gap-1 rounded-full bg-surface-3/80 px-3 py-1.5 text-xs font-semibold text-text-primary transition-all active:scale-95 hover:bg-surface-3"
          >
            <span>Terminy</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </Pressable>
        </div>
      </div>
    </div>
  );
}
