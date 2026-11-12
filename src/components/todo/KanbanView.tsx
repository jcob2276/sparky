import { updateTodoItem } from '../../lib/todo/todo';
import { PRIORITY, PRIORITY_ORDER } from './todoUtils';
import { ArrowRightLeft } from 'lucide-react';
import { Pressable, ControlSelect } from '../ui/ControlPrimitives';

interface Item {
  id: string;
  title: string;
  priority: string;
  is_important: boolean;
  due_date: string | null;
  status: string;
  duration_minutes: number | null;
  section_id: string | null;
}

interface Section {
  id: string;
  name: string;
}

interface Props {
  items: Item[];
  sections: Section[];
  setItems: (fn: (prev: Item[]) => Item[]) => void;
  today: string;
}

export default function KanbanView({ items, sections, setItems, today }: Props) {
  const open = items.filter((i) => i.status === 'open');

  const columns: Array<{ id: string | null; title: string }> = [
    { id: null, title: 'Skrzynka' },
    ...sections.map((s) => ({ id: s.id, title: s.name })),
  ];

  function moveToSection(item: Item, sectionId: string | null) {
    if (item.section_id === sectionId) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, section_id: sectionId } : i)),
    );
    updateTodoItem(item.id, { section_id: sectionId }).catch(() => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, section_id: item.section_id } : i)),
      );
    });
  }

  function completeTask(id: string) {
    const completedAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'done' } : i)),
    );
    updateTodoItem(id, { status: 'done', completed_at: completedAt }).catch(() => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'open' } : i)),
      );
    });
  }

  const dueBadge = (item: Item) => {
    if (!item.due_date) return null;
    const overdue = item.due_date < today;
    const isToday = item.due_date === today;
    return (
      <span className={`text-xs ${overdue ? 'text-danger' : isToday ? 'text-warning' : 'text-text-secondary'}`}>
        {isToday ? 'Dziś' : overdue ? `⚠ ${item.due_date}` : item.due_date}
      </span>
    );
  };

  return (
    <div className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-20 pt-4 gap-4 sm:snap-none">
      {columns.map((col) => {
        const colItems = open
          .filter((i) => i.section_id === col.id)
          .sort((a, b) => PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority));

        return (
          <section
            key={String(col.id)}
            aria-label={col.title}
            className="flex-shrink-0 todo-kanban-col snap-start flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              const item = items.find((i) => i.id === id);
              if (item) moveToSection(item, col.id);
            }}
          >
            <header className="flex items-center justify-between px-1 pb-2">
              <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight text-text-primary">{col.title}</h3>
              {colItems.length > 0 && <span className="text-sm tabular-nums text-text-secondary">{colItems.length}</span>}
            </header>

            <div className="flex-1 overflow-y-auto">
              {colItems.length === 0 ? (
                <p className="px-1 py-2 text-xs text-text-muted"><span className="hidden sm:inline">Przeciągnij tutaj</span><span className="sm:hidden">Brak zadań</span></p>
              ) : (
                <div className="todo-focus-grid">
                  {colItems.map((item) => {
                    const pMeta = PRIORITY[item.priority as keyof typeof PRIORITY];
                    const flagged = item.priority === 'urgent' || item.priority === 'high';
                    const meta = [item.duration_minutes ? (item.duration_minutes < 60 ? `${item.duration_minutes} min` : `${Math.floor(item.duration_minutes / 60)} h`) : null].filter(Boolean);
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                        className="group flex min-h-11 items-center gap-1 pl-1 pr-1 sm:cursor-grab sm:active:cursor-grabbing"
                      >
                        <Pressable
                          haptic="none"
                          onClick={(e) => {
                            e.stopPropagation();
                            completeTask(item.id);
                          }}
                          className="todo-instant flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:shadow-focus"
                          role="checkbox"
                          aria-checked={false}
                          aria-label={`Oznacz jako wykonane: ${item.title}`}
                        >
                          <span className="todo-focus-check" />
                        </Pressable>
                        <div className="min-w-0 flex-1 py-2">
                          <p className="line-clamp-3 text-[length:var(--todo-row-title-size)] font-[number:var(--todo-row-title-weight)] leading-snug text-text-primary">{item.title}</p>
                          {(flagged || meta.length > 0 || item.due_date) && (
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                              {flagged && <span className="font-medium text-warning">{pMeta?.label ?? item.priority}</span>}
                              {meta.map((m) => <span key={m}>{m}</span>)}
                              {dueBadge(item)}
                            </p>
                          )}
                        </div>
                        {/* Touch devices have no HTML5 drag: a native picker behind an icon moves the task. */}
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary sm:hidden">
                          <ArrowRightLeft size={16} aria-hidden="true" />
                          <ControlSelect
                            value={item.section_id ?? ''}
                            onChange={(e) => moveToSection(item, e.target.value || null)}
                            aria-label={`Przenieś zadanie: ${item.title}`}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          >
                            {columns.map((c) => <option key={String(c.id)} value={c.id ?? ''}>{c.title}</option>)}
                          </ControlSelect>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
