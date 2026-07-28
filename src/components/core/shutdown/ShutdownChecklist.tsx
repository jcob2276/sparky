import { useMemo, useState } from 'react';
import { CheckSquare2, Plus, X } from 'lucide-react';
import { useSupplementLogs, useSupplements, useToggleSupplement } from '../../../lib/health/supplementsApi';
import { notify } from '../../../lib/notify';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import {
  buildShutdownChecklistRows,
  normalizeCustomShutdownItem,
  type ShutdownChecklistItem,
} from './shutdownChecklistModel';

interface Props {
  userId: string;
  date: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function ShutdownChecklist({ userId, date }: Props) {
  const customKey = `vanguard_shutdown_checklist_items_${userId}`;
  const checkedKey = `vanguard_shutdown_checklist_checked_${userId}_${date}`;
  const [customItems, setCustomItems] = useState<ShutdownChecklistItem[]>(() => readJson(customKey, []));
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(
    () => new Set(readJson<string[]>(checkedKey, [])),
  );
  const [newItem, setNewItem] = useState('');
  const { data: supplements = [] } = useSupplements(userId);
  const { data: logs = [] } = useSupplementLogs(userId, date);
  const toggleSupplement = useToggleSupplement();
  const activeSupplements = supplements.filter((supplement) => supplement.active);
  const loggedSupplementIds = useMemo(
    () => new Set(logs.filter((log) => log.date === date).map((log) => log.supplement_id)),
    [logs, date],
  );
  const rows = buildShutdownChecklistRows({
    customItems,
    supplements: activeSupplements,
    loggedSupplementIds,
    checkedItemIds,
  });

  const persistCustomItems = (items: ShutdownChecklistItem[]) => {
    setCustomItems(items);
    localStorage.setItem(customKey, JSON.stringify(items));
  };

  const toggleRitual = (id: string) => {
    setCheckedItemIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(checkedKey, JSON.stringify([...next]));
      return next;
    });
  };

  const toggleSupplementRow = async (supplementId: string) => {
    const existingLog = logs.find(
      (log) => log.supplement_id === supplementId && log.date === date,
    );
    try {
      await toggleSupplement.mutateAsync({
        userId,
        supplementId,
        date,
        sinceDate: date,
        existingLog,
      });
    } catch (error: unknown) {
      console.warn('[ShutdownChecklist] Supplement toggle failed:', error);
      notify('Nie udało się zapisać suplementu.', 'error');
    }
  };

  const addItem = () => {
    const item = normalizeCustomShutdownItem(newItem);
    if (!item) return;
    persistCustomItems([...customItems, item]);
    setNewItem('');
  };

  return (
    <section className="space-y-3 rounded-2xl border-2 border-warning/40 bg-warning/5 p-4 shadow-[var(--shadow-card)]">
      <div>
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-warning">
          <CheckSquare2 size={15} /> Codzienna checklista
        </span>
        <p className="mt-1 text-2xs font-semibold text-text-muted">Przejdź po niej świadomie przed zamknięciem dnia.</p>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 rounded-xl border border-border-custom/40 bg-surface-solid px-3 py-2.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
              <ControlInput
                type="checkbox"
                checked={row.checked}
                onChange={() => row.kind === 'supplement' && row.supplementId
                  ? void toggleSupplementRow(row.supplementId)
                  : toggleRitual(row.id)}
                className="size-5 accent-primary"
              />
              <span className={`text-sm font-semibold ${row.checked ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                {row.kind === 'supplement' ? `Suplement · ${row.label}` : row.label}
              </span>
            </label>
            {row.kind === 'custom' ? (
              <Pressable
                type="button"
                aria-label={`Usuń ${row.label}`}
                onClick={() => persistCustomItems(customItems.filter((item) => item.id !== row.id))}
                className="rounded-full p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
              >
                <X size={13} />
              </Pressable>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <ControlInput
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Dopisz własny punkt…"
          className="min-w-0 flex-1 rounded-xl border border-border-custom bg-surface-solid px-3 py-2 text-sm"
        />
        <Button type="button" size="sm" variant="outline" icon={<Plus size={13} />} onClick={addItem}>
          Dodaj
        </Button>
      </div>
    </section>
  );
}
