import {
  type Supplement,
} from '../../../lib/health/supplementsClient';
import {
  useSupplements,
  useSupplementLogs,
  useSaveSupplement,
} from '../../../lib/health/supplementsApi';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { confirmDialog, notify } from '../../../lib/notify';

export function useSupplementsData(userId: string) {
  const today = getTodayWarsaw();
  const sinceDate = shiftDateStr(today, -14);

  const last7Days = (() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) dates.push(shiftDateStr(today, -i));
    return dates;
  })();

  const { data: supplements = [], isLoading: supplementsLoading, error: supplementsError } = useSupplements(userId);
  const { data: logs = [], isLoading: logsLoading, error: logsError } = useSupplementLogs(userId, sinceDate);

  const loading = supplementsLoading || logsLoading;
  const error = supplementsError || logsError ? 'Nie udało się załadować suplementów.' : null;

  const saveMutation = useSaveSupplement();

  async function handleDeactivate(sup: Supplement) {
    if (!await confirmDialog(`Czy na pewno chcesz zarchiwizować suplement "${sup.name}"?`)) return;
    try {
      await saveMutation.mutateAsync({
        userId,
        supplement: { ...sup, active: false },
      });
    } catch (err: unknown) {
      notify('Nie udało się zarchiwizować suplementu.', 'error');
      console.warn('[SupplementsPanel] Failed to deactivate supplement:', err);
    }
  }

  function isLogged(supplementId: string, date: string): boolean {
    return logs.some(l => l.supplement_id === supplementId && l.date === date);
  }

  async function handleUpdateReminder(sup: Supplement, nextReminderTime: string | null) {
    try {
      await saveMutation.mutateAsync({
        userId,
        supplement: {
          ...sup,
          reminder_time: nextReminderTime,
          reminder_sent_date: null,
        },
      });
      notify(nextReminderTime ? `Przypomnienie: ${nextReminderTime.slice(0, 5)}` : 'Przypomnienie wyłączone', 'success');
    } catch (err: unknown) {
      notify('Nie udało się zapisać godziny przypomnienia.', 'error');
      console.warn('[SupplementsPanel] Failed to update reminder:', err);
    }
  }

  async function handleRenewCycle(sup: Supplement, days: number = 30) {
    try {
      const newStart = today;
      const newEnd = shiftDateStr(today, days);
      await saveMutation.mutateAsync({
        userId,
        supplement: {
          ...sup,
          start_date: newStart,
          end_date: newEnd,
        },
      });
      notify(`Odnowiono cykl "${sup.name}" na kolejne ${days} dni.`, 'success');
    } catch (err: unknown) {
      notify('Nie udało się odnowić cyklu.', 'error');
      console.warn('[SupplementsPanel] Failed to renew cycle:', err);
    }
  }

  const activeSups = supplements.filter(s => s.active);

  return {
    supplements, logs, loading, error, activeSups,
    today, last7Days,
    handleDeactivate, handleUpdateReminder, isLogged, handleRenewCycle,
  };
}

