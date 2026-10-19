import {
  ArrowRightLeft, CalendarDays, CalendarClock, CalendarRange, CheckCircle2, ChevronsRight, Columns3, Flag,
  Grid2x2, Inbox, ListChecks, ListTodo, PanelRight, Plus, Folder, type LucideIcon,
} from 'lucide-react';
import { fuzzyMatch, rankTasks, type RankableTask } from './todoPaletteSearch';
import type { TodoNavTarget } from './todoPaletteNav';
import type { TodoViewMode } from './TodoHeader';

export const PALETTE_LISTBOX_ID = 'todo-palette-listbox';
export const paletteOptionId = (index: number) => `todo-palette-option-${index}`;

export type PaletteMode =
  | { kind: 'root' }
  | { kind: 'pick-task' }
  | { kind: 'pick-section'; taskId: string; taskTitle: string; currentSectionId: string | null };

export interface PaletteTask extends RankableTask {
  section_id: string | null;
}

export interface PaletteEntry {
  id: string;
  label: string;
  meta?: string;
  shortcut?: string;
  icon: LucideIcon;
  indices?: number[];
  /** Task rows: Tab starts the "move to…" flow for this task. */
  taskId?: string;
  run: () => void;
}

export interface PaletteGroup {
  label: string;
  entries: PaletteEntry[];
}

interface PaletteSection { id: string; name: string }

export interface PaletteHandlers {
  newTask: () => void;
  startMove: () => void;
  setView: (view: TodoViewMode) => void;
  goTo: (target: TodoNavTarget) => void;
  goToSection: (section: PaletteSection) => void;
  toggleCalendar: () => void;
  openTask: (taskId: string) => void;
  pickTaskToMove: (task: PaletteTask) => void;
  moveTask: (taskId: string, sectionId: string | null) => void;
}

interface BuildInput {
  mode: PaletteMode;
  query: string;
  tasks: readonly PaletteTask[];
  sections: readonly PaletteSection[];
  today: string;
  handlers: PaletteHandlers;
}

const NAV_TARGETS: { target: TodoNavTarget; label: string; icon: LucideIcon }[] = [
  { target: 'inbox', label: 'Skrzynka', icon: Inbox },
  { target: 'today', label: 'Dziś', icon: CalendarDays },
  { target: 'upcoming', label: 'Nadchodzące', icon: CalendarClock },
  { target: 'all', label: 'Wszystkie', icon: ListChecks },
  { target: 'flagged', label: 'Z flagą', icon: Flag },
  { target: 'completed', label: 'Ukończone', icon: CheckCircle2 },
];

function commandEntries(sections: readonly PaletteSection[], h: PaletteHandlers): (PaletteEntry & { group: string; keywords: string })[] {
  const entries: (PaletteEntry & { group: string; keywords: string })[] = [
    { group: 'Akcje', id: 'new', label: 'Nowe zadanie', shortcut: 'N', icon: Plus, keywords: 'dodaj utworz new add', run: h.newTask },
    { group: 'Akcje', id: 'move', label: 'Przenieś zadanie do…', shortcut: '>', icon: ArrowRightLeft, keywords: 'przenies sekcja lista move', run: h.startMove },
    { group: 'Akcje', id: 'calendar', label: 'Pokaż/ukryj kalendarz dnia', icon: PanelRight, keywords: 'kalendarz panel wydarzenia calendar', run: h.toggleCalendar },
    { group: 'Widok', id: 'view-lista', label: 'Przełącz widok: Lista', shortcut: '1', icon: ListTodo, keywords: 'lista list', run: () => h.setView('lista') },
    { group: 'Widok', id: 'view-kanban', label: 'Przełącz widok: Kanban', shortcut: '2', icon: Columns3, keywords: 'kanban tablica board', run: () => h.setView('kanban') },
    { group: 'Widok', id: 'view-matrix', label: 'Przełącz widok: Macierz', shortcut: '3', icon: Grid2x2, keywords: 'macierz eisenhower matrix', run: () => h.setView('eisenhower') },
  ];
  for (const nav of NAV_TARGETS) {
    entries.push({ group: 'Idź do', id: `go-${nav.target}`, label: `Idź do: ${nav.label}`, icon: nav.icon, keywords: 'przejdz go', run: () => h.goTo(nav.target) });
  }
  for (const section of sections) {
    entries.push({ group: 'Idź do', id: `go-section-${section.id}`, label: `Idź do: ${section.name}`, meta: 'sekcja', icon: Folder, keywords: 'przejdz sekcja lista go', run: () => h.goToSection(section) });
  }
  return entries;
}

function filterCommands(query: string, sections: readonly PaletteSection[], h: PaletteHandlers): PaletteGroup[] {
  const all = commandEntries(sections, h);
  const hits = query.trim()
    ? all
      .map((entry) => ({ entry, match: fuzzyMatch(query, `${entry.label} ${entry.keywords}`) }))
      .filter((hit): hit is { entry: typeof hit.entry; match: NonNullable<typeof hit.match> } => hit.match !== null)
      .sort((a, b) => b.match.score - a.match.score)
      .map(({ entry, match }) => ({ ...entry, indices: match.indices.filter((i) => i < entry.label.length) }))
    : all;
  const groups = new Map<string, PaletteEntry[]>();
  for (const { group, keywords: _keywords, ...entry } of hits) {
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  return [...groups].map(([label, entries]) => ({ label, entries }));
}

function dueMeta(task: PaletteTask, today: string): string | undefined {
  if (!task.due_date) return undefined;
  return task.due_date === today ? 'dziś' : task.due_date;
}

export function buildPaletteGroups({ mode, query, tasks, sections, today, handlers: h }: BuildInput): PaletteGroup[] {
  if (mode.kind === 'pick-section') {
    const options: PaletteSection[] = [{ id: '', name: 'Skrzynka (bez listy)' }, ...sections];
    const entries = options
      .map((option) => ({ option, match: fuzzyMatch(query, option.name) }))
      .filter((hit) => hit.match !== null)
      .map(({ option, match }) => ({
        id: `move-${option.id || 'inbox'}`,
        label: option.name,
        meta: (option.id || null) === mode.currentSectionId ? 'obecna' : undefined,
        icon: option.id ? Folder : Inbox,
        indices: match?.indices,
        run: () => h.moveTask(mode.taskId, option.id || null),
      }));
    return [{ label: `Przenieś „${mode.taskTitle}” do`, entries }];
  }

  if (mode.kind === 'pick-task') {
    const open = tasks.filter((task) => task.status !== 'done');
    const pool = query.trim()
      ? rankTasks(query, open, 12).map((r) => ({ task: r.task, indices: r.titleIndices }))
      : open.slice(0, 12).map((task) => ({ task, indices: [] as number[] }));
    return [{
      label: 'Wybierz zadanie do przeniesienia',
      entries: pool.map(({ task, indices }) => ({
        id: `pick-${task.id}`, label: task.title, meta: task.sectionName ?? undefined,
        icon: ChevronsRight, indices, run: () => h.pickTaskToMove(task),
      })),
    }];
  }

  const groups: PaletteGroup[] = [];
  const ranked = rankTasks(query, tasks, 8);
  if (ranked.length > 0) {
    groups.push({
      label: 'Zadania',
      entries: ranked.map(({ task, titleIndices }) => ({
        id: `task-${task.id}`,
        label: task.title,
        meta: [task.sectionName, dueMeta(task, today), ...(task.tags ?? []).slice(0, 2).map((t) => `#${t}`)].filter(Boolean).join(' · ') || undefined,
        icon: task.status === 'done' ? CheckCircle2 : CalendarRange,
        indices: titleIndices,
        taskId: task.id,
        run: () => h.openTask(task.id),
      })),
    });
  }
  return [...groups, ...filterCommands(query, sections, h)].filter((group) => group.entries.length > 0);
}
