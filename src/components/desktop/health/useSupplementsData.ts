import { useState } from 'react';
import {
  type Supplement,
} from '../../../lib/health/supplementsClient';
import {
  useSupplements,
  useSupplementLogs,
  useToggleSupplement,
  useSaveSupplement,
} from '../../../lib/health/supplementsApi';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { confirmDialog, notify } from '../../../lib/notify';

const MORNING_REMINDER_DEFAULT = '08:00';
const EVENING_REMINDER_DEFAULT = '21:30';

function isEveningSupplementName(name: string): boolean {
  return /pyłek|pylek|pollen/i.test(name);
}

function useSupplementFormState() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [unit, setUnit] = useState('porcja');
  const [skipQty, setSkipQty] = useState(false);
  const [reverseLogic, setReverseLogic] = useState(false);
  const [hasCycle, setHasCycle] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const defaultHasReminder = reverseLogic || isEveningSupplementName(name);
  const defaultReminderTime = defaultHasReminder ? EVENING_REMINDER_DEFAULT : MORNING_REMINDER_DEFAULT;
  const [hasReminder, setHasReminder] = useState(defaultHasReminder);
  const [reminderTime, setReminderTime] = useState(defaultReminderTime);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName(''); setEmoji('💊'); setUnit('porcja'); setSkipQty(false); setReverseLogic(false);
    setHasCycle(false); setStartDate(''); setEndDate('');
    setHasReminder(false); setReminderTime(MORNING_REMINDER_DEFAULT); setShowAddForm(false);
  };

  return {
    showAddForm, setShowAddForm,
    name, setName, emoji, setEmoji, unit, setUnit, skipQty, setSkipQty,
    reverseLogic, setReverseLogic,
    hasCycle, setHasCycle, startDate, setStartDate, endDate, setEndDate,
    hasReminder, setHasReminder, reminderTime, setReminderTime,
    submitting, setSubmitting, resetForm,
  };
}

export function useSupplementsData(userId: string) {
  const form = useSupplementFormState();

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

  const toggleMutation = useToggleSupplement();
  const saveMutation = useSaveSupplement();

  async function handleToggle(sup: Supplement) {
    const existingLog = logs.find(l => l.supplement_id === sup.id && l.date === today);
    try {
      await toggleMutation.mutateAsync({
        userId,
        supplementId: sup.id,
        date: today,
        sinceDate,
        existingLog,
      });
    } catch (err: unknown) {
      notify('Nie udało się zapisać zażycia suplementu.', 'error');
      console.warn('[SupplementsPanel] Failed to toggle supplement log:', err);
    }
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    form.setSubmitting(true);
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sup_' + Date.now();
      await saveMutation.mutateAsync({
        userId,
        supplement: {
          slug,
          name: form.name.trim(),
          emoji: form.emoji.trim() || '💊',
          unit: form.unit.trim() || 'kapsułka',
          dose_per_unit: { reverse_logic: form.reverseLogic },
          sort_order: supplements.length + 1,
          active: true,
          start_date: form.hasCycle && form.startDate ? form.startDate : null,
          end_date: form.hasCycle && form.endDate ? form.endDate : null,
          reminder_time: form.hasReminder && form.reminderTime ? form.reminderTime : null,
          skip_qty: form.skipQty,
        },
      });
      form.resetForm();
    } catch (err: unknown) {
      console.error('[supplements] Save failed:', err);
      notify('Wystąpił błąd podczas zapisywania suplementu.', 'error');
    } finally { form.setSubmitting(false); }
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

  async function handleLogAllToday() {
    const unloggedSups = activeSups.filter(sup => {
      const isReverse = sup.name.toLowerCase().includes('pyłek') || sup.name.toLowerCase().includes('pollen') || sup.dose_per_unit?.['reverse_logic'] === true;
      const takenToday = isReverse ? !isLogged(sup.id, today) : isLogged(sup.id, today);
      return !takenToday;
    });
    if (unloggedSups.length === 0) {
      notify('Wszystkie suplementy na dziś są już zalogowane!', 'info');
      return;
    }
    try {
      for (const sup of unloggedSups) {
        const existingLog = logs.find(l => l.supplement_id === sup.id && l.date === today);
        await toggleMutation.mutateAsync({
          userId,
          supplementId: sup.id,
          date: today,
          sinceDate,
          existingLog,
        });
      }
      notify(`Zalogowano ${unloggedSups.length} suplementów na dziś!`, 'success');
    } catch (err: unknown) {
      notify('Wystąpił błąd podczas masowego logowania.', 'error');
      console.warn('[SupplementsPanel] Failed to batch log:', err);
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
    ...form,
    today, last7Days,
    handleToggle, handleDeactivate, handleSubmit, handleUpdateReminder, isLogged,
    handleLogAllToday, handleRenewCycle,
  };
}
