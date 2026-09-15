import { nextOccurrence, shiftDateStr } from '@vanguard/domain';
import { confirmDialog, notify } from '../../lib/notify';
import { formatLongDateWarsaw } from '../../lib/date';
import { createTodoItem } from '../../lib/todo/todo';
import { useCreateCalendarEvent } from '../../lib/calendarApi';
import type {
  LifeObligation,
  LifeObligationInput,
  useLifeObligationMutations,
} from '../../lib/lifeObligationsApi';
import {
  buildICSContent,
  downloadICSFile,
  type DerivedObligation,
} from './terminyDerived';

interface UseTerminyActionsParams {
  userId?: string;
  today: string;
  allRows: DerivedObligation[];
  editing: LifeObligation | null;
  mutations: ReturnType<typeof useLifeObligationMutations>;
  onSuccessSave: () => void;
}

export function useTerminyActions({
  userId,
  today,
  allRows,
  editing,
  mutations,
  onSuccessSave,
}: UseTerminyActionsParams) {
  const { add, remove, update } = mutations;
  const createCalendarEvent = useCreateCalendarEvent();

  const submit = async (input: LifeObligationInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...input });
        notify('Zapisano zmiany', 'success');
      } else {
        await add.mutateAsync(input);
        notify('Dodano termin', 'success');
      }
      onSuccessSave();
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się zapisać', 'error');
    }
  };

  const onDelete = async (id: string, title: string) => {
    if (!(await confirmDialog(`Usunąć „${title}”?`))) return;
    try {
      await remove.mutateAsync(id);
      notify('Usunięto', 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się usunąć', 'error');
    }
  };

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
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się zaktualizować', 'error');
    }
  };

  const handleConvertToTodo = async (row: DerivedObligation) => {
    if (!userId) return;
    try {
      await createTodoItem(userId, {
        title: `Termin: ${row.item.title}${row.item.related_name ? ` (${row.item.related_name})` : ''}`,
        due_date: row.nextDate,
        notes: row.item.notes ? `Wpis z Terminów: ${row.item.notes}` : `Termin: ${row.nextDate}`,
      });
      notify(`Utworzono zadanie w Todo: „${row.item.title}”`, 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się utworzyć zadania', 'error');
    }
  };

  const handleAddToCalendar = async (row: DerivedObligation) => {
    if (!userId) return;
    try {
      const startIso = `${row.nextDate}T09:00:00+02:00`;
      const endIso = `${row.nextDate}T10:00:00+02:00`;
      const title = `Termin: ${row.item.title}${row.item.related_name ? ` (${row.item.related_name})` : ''}`;
      const desc = row.item.notes ? `Szczegóły: ${row.item.notes}` : `Termin: ${row.item.title}`;
      await createCalendarEvent.mutateAsync({
        userId,
        event: {
          summary: title,
          start: startIso,
          end: endIso,
          description: desc,
          category: 'terminy',
        },
      });
      notify(`Dodano do Kalendarza Vanguard: „${row.item.title}” (${formatLongDateWarsaw(row.nextDate)})`, 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się dodać do kalendarza', 'error');
    }
  };

  const handleExportICS = async (row: DerivedObligation) => {
    try {
      const ics = buildICSContent([row]);
      const filename = `${row.item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${row.nextDate}.ics`;
      await downloadICSFile(filename, ics);
      notify(`Pobrano plik iCal: ${filename}`, 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Błąd generowania pliku iCal', 'error');
    }
  };

  const handleExportAllICS = async () => {
    if (allRows.length === 0) {
      notify('Brak terminów do wyeksportowania', 'info');
      return;
    }
    try {
      const ics = buildICSContent(allRows);
      const filename = `terminy-vanguard-${today}.ics`;
      await downloadICSFile(filename, ics);
      notify(`Wyeksportowano ${allRows.length} terminów do ${filename}`, 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Błąd generowania pliku iCal', 'error');
    }
  };

  return {
    submit,
    onDelete,
    handleComplete,
    handleConvertToTodo,
    handleAddToCalendar,
    handleExportICS,
    handleExportAllICS,
  };
}
