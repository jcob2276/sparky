import { useState } from 'react';
import type { CalRow } from '../calendarHelpers';
import type { RecurrenceKind } from './calendarDataHelpers';

/** Form state of the event edit dialog (plus the selected event and `deleting` flag). */
export function useCalendarEditState() {
  const [selectedEvent, setSelectedEvent] = useState<CalRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAllDay, setEditAllDay] = useState(false);
  const [editReminder, setEditReminder] = useState<number | null>(null);
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceKind>('');
  const [editCustomDays, setEditCustomDays] = useState<string[]>([]);
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState('');
  const [deleting, setDeleting] = useState(false);

  return {
    selectedEvent, setSelectedEvent,
    editTitle, setEditTitle,
    editCategory, setEditCategory,
    editStart, setEditStart,
    editEnd, setEditEnd,
    editDate, setEditDate,
    editDescription, setEditDescription,
    editLocation, setEditLocation,
    editAllDay, setEditAllDay,
    editReminder, setEditReminder,
    editRecurrence, setEditRecurrence,
    editCustomDays, setEditCustomDays,
    editRecurrenceEndDate, setEditRecurrenceEndDate,
    deleting, setDeleting,
  };
}
