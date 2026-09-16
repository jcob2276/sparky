import type { QueryClient } from '@tanstack/react-query';
import { queryClient as defaultQueryClient } from './queryClient';
import { calendarKeys, todoKeys, notesKeys, lifeObligationKeys } from './queryKeys';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO } from './date';
import { supabase } from './supabase';
import { fetchLifeObligations } from './lifeObligationsApi';
import { listTodoItems, listTodoSections, listSmartLists } from './todo/todo';
import { listProjects } from './projects/projects';
import { fetchNotesList } from './notesApi';
import { fetchNoteFolders } from './noteFoldersApi';

// Module-level caches to avoid duplicate import promises
let calendarModulePromise: Promise<unknown> | null = null;
let todoModulePromise: Promise<unknown> | null = null;
let keepModulePromise: Promise<unknown> | null = null;
let terminyModulePromise: Promise<unknown> | null = null;

function prefetchCalendarModule() {
  if (!calendarModulePromise) {
    calendarModulePromise = import('../components/calendar/CalendarView');
  }
  return calendarModulePromise;
}

function prefetchTodoModule() {
  if (!todoModulePromise) {
    todoModulePromise = import('../components/todo/Todo');
  }
  return todoModulePromise;
}

function prefetchKeepModule() {
  if (!keepModulePromise) {
    keepModulePromise = import('../components/notes/Keep');
  }
  return keepModulePromise;
}

function prefetchTerminyModule() {
  if (!terminyModulePromise) {
    terminyModulePromise = import('../components/terminy/TerminyPage');
  }
  return terminyModulePromise;
}

export async function prefetchCalendarData(queryClient: QueryClient, userId: string) {
  void prefetchCalendarModule();
  if (!userId) return;

  const today = getTodayWarsaw();
  const rangeStart = shiftDateStr(today, -7);
  const rangeEnd = shiftDateStr(today, 14);

  const { fromISO } = warsawDayBoundsISO(rangeStart);
  const { fromISO: toISO } = warsawDayBoundsISO(rangeEnd);

  await Promise.allSettled([
    // Calendar events
    queryClient.prefetchQuery({
      queryKey: calendarKeys.events(userId, rangeStart, rangeEnd),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('vanguard_calendar')
          .select('*')
          .eq('user_id', userId)
          .gte('start_time', fromISO)
          .lt('start_time', toISO)
          .order('start_time', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
      },
      staleTime: 60_000,
    }),
    // Life obligations
    queryClient.prefetchQuery({
      queryKey: lifeObligationKeys.list(userId),
      queryFn: () => fetchLifeObligations(userId),
      staleTime: 60_000,
    }),
    // Calendar todos inbox
    queryClient.prefetchQuery({
      queryKey: ['calendar-todos-inbox', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('todo_items')
          .select('id, title, status, due_date, scheduled_time, duration_minutes, section_id, category, priority, notes, recurrence')
          .eq('user_id', userId)
          .eq('status', 'open')
          .is('due_date', null)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        return data || [];
      },
      staleTime: 60_000,
    }),
    // Calendar todos scheduled
    queryClient.prefetchQuery({
      queryKey: ['calendar-todos-scheduled', userId, rangeStart, rangeEnd],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('todo_items')
          .select('id, title, status, due_date, scheduled_time, duration_minutes, section_id, category, priority, notes, recurrence')
          .eq('user_id', userId)
          .eq('status', 'open')
          .gte('due_date', rangeStart)
          .lt('due_date', rangeEnd)
          .not('due_date', 'is', null);
        if (error) throw error;
        return data || [];
      },
      staleTime: 60_000,
    }),
  ]);
}

export async function prefetchTodoData(queryClient: QueryClient, userId: string) {
  void prefetchTodoModule();
  if (!userId) return;

  const today = getTodayWarsaw();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: todoKeys.items(userId),
      queryFn: () => listTodoItems(userId),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: todoKeys.sections(userId),
      queryFn: () => listTodoSections(userId),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: todoKeys.projects(userId),
      queryFn: () => listProjects(userId),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: todoKeys.smartLists(userId),
      queryFn: () => listSmartLists(userId),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['todo', 'dailyWins', userId, today],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('daily_wins')
          .select('id, daily_win_tasks(todo_id)')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data || null;
      },
      staleTime: 60_000,
    }),
  ]);
}

export async function prefetchKeepData(queryClient: QueryClient, userId: string) {
  void prefetchKeepModule();
  if (!userId) return;

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: notesKeys.list(userId),
      queryFn: () => fetchNotesList(userId),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: notesKeys.folders(userId),
      queryFn: () => fetchNoteFolders(userId),
      staleTime: 60_000,
    }),
  ]);
}

export async function prefetchTerminyData(queryClient: QueryClient, userId: string) {
  void prefetchTerminyModule();
  if (!userId) return;

  await queryClient.prefetchQuery({
    queryKey: lifeObligationKeys.list(userId),
    queryFn: () => fetchLifeObligations(userId),
    staleTime: 60_000,
  });
}

/**
 * Universal intent-based prefetcher triggered on hover / touchstart / focus
 */
export function prefetchWorkspaceRoute(userId: string | undefined, dest: string, client: QueryClient = defaultQueryClient) {
  const normalized = dest.replace(/^\//, '');
  if (normalized === 'kalendarz') {
    if (userId) void prefetchCalendarData(client, userId);
    else void prefetchCalendarModule();
  } else if (normalized === 'todo') {
    if (userId) void prefetchTodoData(client, userId);
    else void prefetchTodoModule();
  } else if (normalized === 'keep') {
    if (userId) void prefetchKeepData(client, userId);
    else void prefetchKeepModule();
  } else if (normalized === 'terminy') {
    if (userId) void prefetchTerminyData(client, userId);
    else void prefetchTerminyModule();
  }
}
