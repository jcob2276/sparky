import type { Note } from './notesApi';

export type NoteSortField = 'updated_at' | 'created_at' | 'title';
type NoteSortDirection = 'asc' | 'desc';
export type NoteTagMode = 'all' | 'any';

export interface NoteCollectionPreferences {
  view: 'list' | 'gallery';
  sortField: NoteSortField;
  direction: NoteSortDirection;
  groupByDate: boolean;
}

export interface NoteSection {
  key: string;
  label: string;
  notes: Note[];
}

export const DEFAULT_NOTE_COLLECTION_PREFERENCES: NoteCollectionPreferences = {
  view: 'list',
  sortField: 'updated_at',
  direction: 'desc',
  groupByDate: true,
};

const WARSAW_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MONTH_LABEL = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  month: 'long',
});

const warsawDay = (value: Date | string): string => WARSAW_DATE.format(new Date(value));

const utcDayNumber = (day: string): number => {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
};

const compareNotes = (
  left: Note,
  right: Note,
  preferences: NoteCollectionPreferences,
): number => {
  let result: number;
  if (preferences.sortField === 'title') {
    result = left.title.localeCompare(right.title, 'pl', { sensitivity: 'base' });
  } else {
    result = new Date(left[preferences.sortField]).getTime()
      - new Date(right[preferences.sortField]).getTime();
  }
  if (result === 0) return left.id.localeCompare(right.id);
  return preferences.direction === 'asc' ? result : -result;
};

const dateSection = (iso: string, now: Date): Pick<NoteSection, 'key' | 'label'> => {
  const currentDay = warsawDay(now);
  const noteDay = warsawDay(iso);
  const age = utcDayNumber(currentDay) - utcDayNumber(noteDay);
  if (age <= 0) return { key: 'today', label: 'Dzisiaj' };
  if (age === 1) return { key: 'yesterday', label: 'Wczoraj' };
  if (age <= 7) return { key: 'previous-7-days', label: 'Poprzednie 7 dni' };
  if (age <= 30) return { key: 'previous-30-days', label: 'Poprzednie 30 dni' };

  const noteDate = new Date(iso);
  const [year, month] = noteDay.split('-');
  const currentYear = currentDay.slice(0, 4);
  const monthName = MONTH_LABEL.format(noteDate);
  return {
    key: `${year}-${month}`,
    label: year === currentYear ? monthName : `${monthName} ${year}`,
  };
};

const groupByDate = (
  notes: Note[],
  preferences: NoteCollectionPreferences,
  now: Date,
): NoteSection[] => {
  const sections = new Map<string, NoteSection>();
  for (const note of notes) {
    const descriptor = dateSection(note[preferences.sortField] as string, now);
    const section = sections.get(descriptor.key) ?? { ...descriptor, notes: [] };
    section.notes.push(note);
    sections.set(descriptor.key, section);
  }
  return [...sections.values()];
};

export function sortAndGroupNotes(
  notes: Note[],
  preferences: NoteCollectionPreferences,
  now = new Date(),
): NoteSection[] {
  const pinned = notes.filter(note => note.is_pinned).sort((a, b) => compareNotes(a, b, preferences));
  const others = notes.filter(note => !note.is_pinned).sort((a, b) => compareNotes(a, b, preferences));
  const sections: NoteSection[] = pinned.length
    ? [{ key: 'pinned', label: 'Przypięte', notes: pinned }]
    : [];

  if (!preferences.groupByDate || preferences.sortField === 'title') {
    return others.length ? [...sections, { key: 'all', label: 'Notatki', notes: others }] : sections;
  }
  return [...sections, ...groupByDate(others, preferences, now)];
}

export function filterNotesByTags(notes: Note[], tags: string[], mode: NoteTagMode): Note[] {
  if (!tags.length) return notes;
  return notes.filter(note => (
    mode === 'all'
      ? tags.every(tag => note.tags.includes(tag))
      : tags.some(tag => note.tags.includes(tag))
  ));
}
