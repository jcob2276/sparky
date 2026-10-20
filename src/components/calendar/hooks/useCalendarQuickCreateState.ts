import { useCallback, useState } from 'react';
import type { RecurrenceKind } from './calendarDataHelpers';

export interface QuickCreateState {
  date: string;
  startMin: number;
}

/** Form state of the quick-create popover (plus the shared `saving` flag). */
export function useCalendarQuickCreateState() {
  const [quickCreate, setQuickCreate] = useState<QuickCreateState | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickCategory, setQuickCategory] = useState<string | null>(null);
  const [quickType, setQuickType] = useState<'event' | 'task'>('event');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickLocation, setQuickLocation] = useState('');
  const [quickAllDay, setQuickAllDay] = useState(false);
  const [quickReminder, setQuickReminder] = useState<number | null>(null);
  const [quickRecurrence, setQuickRecurrence] = useState<RecurrenceKind>('');
  const [quickCustomDays, setQuickCustomDays] = useState<string[]>([]);
  const [quickRecurrenceEndDate, setQuickRecurrenceEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const closeQuickCreate = useCallback(() => {
    setQuickCreate(null);
    setQuickTitle('');
    setQuickDuration(60);
    setQuickCategory(null);
    setQuickType('event');
    setQuickDescription('');
    setQuickLocation('');
    setQuickAllDay(false);
    setQuickReminder(null);
    setQuickRecurrence('');
    setQuickCustomDays([]);
    setQuickRecurrenceEndDate('');
  }, []);

  return {
    quickCreate, setQuickCreate, closeQuickCreate,
    quickTitle, setQuickTitle,
    quickDuration, setQuickDuration,
    quickCategory, setQuickCategory,
    quickType, setQuickType,
    quickDescription, setQuickDescription,
    quickLocation, setQuickLocation,
    quickAllDay, setQuickAllDay,
    quickReminder, setQuickReminder,
    quickRecurrence, setQuickRecurrence,
    quickCustomDays, setQuickCustomDays,
    quickRecurrenceEndDate, setQuickRecurrenceEndDate,
    saving, setSaving,
  };
}
