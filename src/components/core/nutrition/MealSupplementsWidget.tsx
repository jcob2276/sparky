import { useMemo, useState } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';
import { notify } from '../../../lib/notify';
import {
  useSupplementLogs,
  useSetSupplementQuantity,
  useSupplements,
  useToggleSupplement,
} from '../../../lib/health/supplementsApi';
import { shortSupplementName } from '../../../lib/health/supplementLabels';
import type { Supplement } from '../../../lib/health/supplementsClient';
import SupplementChip from './SupplementChip';

const QUANTITY_CHOICES = [1, 2, 3, 4, 5, 6];

function isReverseLogic(sup: Supplement): boolean {
  return /pyłek|pylek|pollen/i.test(sup.name) || sup.dose_per_unit?.['reverse_logic'] === true;
}

/** Stała dawka (kreatyna = 6 g) — bez wyboru liczby porcji. */
const FIXED_DOSE_SLUGS = new Set(['kreatyna']);
/** Chwilowo ukryte w widoku posiłku. */
const HIDDEN_SLUGS = new Set(['cynk']);

function isDueOn(sup: Supplement, date: string): boolean {
  if (!sup.active || isReverseLogic(sup) || HIDDEN_SLUGS.has(sup.slug)) return false;
  if (sup.start_date && date < sup.start_date) return false;
  if (sup.end_date && date > sup.end_date) return false;
  return true;
}

export default function MealSupplementsWidget({ userId, date }: { userId: string; date: string }) {
  const haptics = useHaptics();
  const { data: supplements = [] } = useSupplements(userId);
  const { data: logs = [] } = useSupplementLogs(userId, date);
  const toggle = useToggleSupplement();
  const setQuantity = useSetSupplementQuantity();
  const [picking, setPicking] = useState<Supplement | null>(null);

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

  const handleQuantity = async (sup: Supplement, quantity: number) => {
    haptics.selection();
    setPicking(null);
    try {
      await setQuantity.mutateAsync({
        userId,
        supplementId: sup.id,
        date,
        quantity,
        existingLog: logBySupplement.get(sup.id) ?? null,
      });
    } catch (error: unknown) {
      console.warn('[MealSupplementsWidget] set quantity failed:', error);
      notify('Nie udało się zapisać liczby.', 'error');
    }
  };

  return (
    <section aria-label="Suplementy" className="space-y-1.5 border-t border-border-custom/40 pt-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold tracking-wide text-text-muted">Suplementy</h3>
        <span className="text-2xs font-bold text-text-muted">{takenCount}/{due.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {due.map((sup) => (
          <SupplementChip
            key={sup.id}
            sup={sup}
            quantity={logBySupplement.has(sup.id) ? Number(logBySupplement.get(sup.id)?.quantity ?? 1) : null}
            disabled={toggle.isPending || setQuantity.isPending}
            onToggle={() => void handleToggle(sup)}
            onLongPress={FIXED_DOSE_SLUGS.has(sup.slug) ? undefined : () => {
              haptics.selection();
              setPicking(sup);
            }}
          />
        ))}
      </div>
      {picking && (
        <div role="group" aria-label={`Ile: ${picking.name}`} className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border-custom/60 bg-surface-solid/50 p-2">
          <span className="px-1 text-xs font-bold text-text-secondary">{shortSupplementName(picking)} · ile?</span>
          {QUANTITY_CHOICES.map((n) => (
            <Pressable
              key={n}
              type="button"
              haptic="none"
              onClick={() => void handleQuantity(picking, n)}
              className={`touch-manipulation size-9 rounded-full border text-sm font-semibold tabular-nums ui-interactive ${
                Number(logBySupplement.get(picking.id)?.quantity ?? 0) === n
                  ? 'border-success/40 bg-success/15 text-success'
                  : 'border-border-custom text-text-primary'
              }`}
            >
              {n}
            </Pressable>
          ))}
          <Pressable type="button" haptic="none" onClick={() => setPicking(null)} className="ml-auto px-2 text-2xs font-bold text-text-muted">
            Anuluj
          </Pressable>
        </div>
      )}
    </section>
  );
}
