import { useState } from 'react';
import { nextOccurrence, shiftDateStr } from '@vanguard/domain';
import { formatLongDateWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { useLifeObligationMutations } from '../../lib/lifeObligationsApi';
import type { DerivedObligation } from './terminyDerived';

/** „Zrealizowano”: termin jednorazowy znika, cykliczny przesuwa się na kolejne wystąpienie. Wspólne dla banera i listy na Dziś. */
export function useCompleteObligation(userId: string | undefined) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const { remove, update } = useLifeObligationMutations(userId);

  const complete = async (row: DerivedObligation) => {
    setCompletedIds((prev) => new Set(prev).add(row.item.id));
    try {
      if (row.item.recurrence === 'once') {
        await remove.mutateAsync(row.item.id);
        notify(`Zrealizowano: „${row.item.title}”`, 'success');
      } else {
        const dayAfter = shiftDateStr(row.nextDate, 1);
        const nextDate = nextOccurrence(row.item.anchor_date, row.item.recurrence, dayAfter) ?? dayAfter;
        await update.mutateAsync({ id: row.item.id, anchor_date: nextDate, sent_reminders: [] });
        notify(`Zrealizowano! Odnowiono termin „${row.item.title}” na ${formatLongDateWarsaw(nextDate)}`, 'success');
      }
    } catch (e: unknown) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.item.id);
        return next;
      });
      notify(e instanceof Error ? e.message : 'Błąd aktualizacji', 'error');
    }
  };

  return { complete, completedIds, pending: update.isPending || remove.isPending };
}
