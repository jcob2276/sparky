import { useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import {
  useSupplementLogs,
  useSupplements,
  useToggleSupplement,
} from '../../../lib/health/supplementsApi';
import type { Supplement } from '../../../lib/health/supplementsClient';

function isReverseLogic(sup: Supplement): boolean {
  return /pyłek|pylek|pollen/i.test(sup.name) || sup.dose_per_unit?.['reverse_logic'] === true;
}

function isDueOn(sup: Supplement, date: string): boolean {
  if (!sup.active || isReverseLogic(sup)) return false;
  if (sup.start_date && date < sup.start_date) return false;
  if (sup.end_date && date > sup.end_date) return false;
  return true;
}

export default function MealSupplementsWidget({ userId, date }: { userId: string; date: string }) {
  const haptics = useHaptics();
  const { data: supplements = [] } = useSupplements(userId);
  const { data: logs = [] } = useSupplementLogs(userId, date);
  const toggle = useToggleSupplement();

  const due = useMemo(() => supplements.filter((sup) => isDueOn(sup, date)), [supplements, date]);
  const logBySupplement = useMemo(() => {
    const map = new Map<string, (typeof logs)[number]>();
    for (const log of logs) if (log.date === date) map.set(log.supplement_id, log);
    return map;
  }, [logs, date]);

  if (!due.length) return null;
  const takenCount = due.filter((sup) => logBySupplement.has(sup.id)).length;

  const handleToggle = async (sup: Supplement) => {
    haptics.selection();
    try {
      await toggle.mutateAsync({
        userId,
        supplementId: sup.id,
        date,
        sinceDate: date,
        existingLog: logBySupplement.get(sup.id) ?? null,
      });
    } catch (error: unknown) {
      console.warn('[MealSupplementsWidget] toggle failed:', error);
      notify('Nie udało się zapisać suplementu.', 'error');
    }
  };

  return (
    <section aria-label="Suplementy" className="space-y-1.5 border-t border-border-custom/40 pt-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">Suplementy</h3>
        <span className="text-2xs font-bold text-text-muted">{takenCount}/{due.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {due.map((sup) => {
          const taken = logBySupplement.has(sup.id);
          return (
            <Pressable
              key={sup.id}
              type="button"
              aria-pressed={taken}
              aria-label={`${sup.name}: ${taken ? 'zażyty, kliknij aby cofnąć' : 'oznacz jako zażyty'}`}
              disabled={toggle.isPending}
              onClick={() => void handleToggle(sup)}
              className={`touch-manipulation flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ui-interactive active:scale-95 disabled:opacity-60 ${
                taken
                  ? 'border-success/40 bg-success/15 text-success'
                  : 'border-border-custom bg-surface-solid/50 text-text-secondary hover:border-success/40'
              }`}
            >
              <span aria-hidden>{sup.emoji || '💊'}</span>
              <span>{sup.name}</span>
              {taken ? <Check size={12} strokeWidth={3} /> : <Plus size={12} className="opacity-60" />}
            </Pressable>
          );
        })}
      </div>
    </section>
  );
}
