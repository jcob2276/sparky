import { useEffect } from 'react';
import { usePersistentDraft } from '../../../hooks/usePersistentDraft';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { workContextFromRow, type WorkContext } from '../../../lib/closer/closerWorkContext';
export function useCloserWorkDraft(userId: string, date: string, row?: CloserDailyLogRow) {
  const [stored, setStored] = usePersistentDraft<WorkContext | null>('sparky:closer-day:' + userId + ':' + date, null);
  const saved = workContextFromRow(row);
  const valid = stored && [stored.work_energy, stored.work_pressure].every(v => v === null || (Number.isInteger(v) && v >= 1 && v <= 5)) && typeof stored.notes === 'string';
  const draft = valid ? stored : saved;
  const dirty = draft.work_energy !== saved.work_energy || draft.work_pressure !== saved.work_pressure || draft.notes !== saved.notes;
  useEffect(() => { if (stored && !dirty) setStored(null); }, [stored, dirty, setStored]);
  return { draft, dirty, setDraft: setStored };
}
