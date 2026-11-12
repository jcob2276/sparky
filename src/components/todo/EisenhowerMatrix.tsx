import { useState } from 'react';
import { updateTodoItem } from '../../lib/todo/todo';
import type { TodoItemUpdate } from '../../lib/todo/todo';
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
}

interface Props {
  items: Item[];
  setItems: (fn: (prev: Item[]) => Item[]) => void;
}

const QUADRANTS = [
  {
    key: 'q1',
    label: 'Zrób teraz',
    sub: 'Pilne + Ważne',
    urgent: true,
    important: true,
    dot: 'bg-danger',
  },
  {
    key: 'q2',
    label: 'Zaplanuj',
    sub: 'Niepilne + Ważne',
    urgent: false,
    important: true,
    dot: 'bg-info',
  },
  {
    key: 'q3',
    label: 'Deleguj',
    sub: 'Pilne + Nieważne',
    urgent: true,
    important: false,
    dot: 'bg-warning',
  },
  {
    key: 'q4',
    label: 'Eliminuj',
    sub: 'Niepilne + Nieważne',
    urgent: false,
    important: false,
    dot: 'bg-text-muted',
  },
];

function isUrgent(item: Item) {
  return item.priority === 'urgent';
}

function quadrantOf(item: Item) {
  const urgent = isUrgent(item);
  const important = item.is_important;
  if (urgent && important) return 'q1';
  if (!urgent && important) return 'q2';
  if (urgent && !important) return 'q3';
  return 'q4';
}

export default function EisenhowerMatrix({ items, setItems }: Props) {
  const [dragOverQ, setDragOverQ] = useState<string | null>(null);
  const open = items.filter((i) => i.status === 'open');

  function moveToQuadrant(item: Item, q: typeof QUADRANTS[0]) {
    const newPriority = q.urgent ? 'urgent' : item.priority === 'urgent' ? 'high' : item.priority;
    const newImportant = q.important;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, priority: newPriority, is_important: newImportant } : i,
      ),
    );
    const patch: TodoItemUpdate = { priority: newPriority, is_important: newImportant };
    updateTodoItem(item.id, patch).catch(() => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, priority: item.priority, is_important: item.is_important } : i)),
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

  return (
    <div className="p-4 pb-24">
      <div className="mx-auto grid max-w-[var(--ds-maxw-700px)] grid-cols-1 gap-5 sm:grid-cols-2">
        {QUADRANTS.map((q) => {
          const qItems = open.filter((i) => quadrantOf(i) === q.key);
          return (
            <section
              key={q.key}
              aria-label={`${q.label}: ${q.sub}`}
              className={`ui-interactive duration-[var(--motion-medium)] ${dragOverQ === q.key ? 'rounded-xl ring-2 ring-primary/30' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverQ(q.key);
              }}
              onDragLeave={() => setDragOverQ(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverQ(null);
                const id = e.dataTransfer.getData('text/plain');
                const item = items.find((i) => i.id === id);
                if (item) moveToQuadrant(item, q);
              }}
            >
              <header className="flex items-center gap-2 px-1 pb-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${q.dot}`} aria-hidden="true" />
                <h3 className="text-sm font-semibold tracking-tight text-text-primary">{q.label}</h3>
                <span className="text-xs text-text-muted">{q.sub}</span>
                {qItems.length > 0 && <span className="ml-auto text-sm tabular-nums text-text-secondary">{qItems.length}</span>}
              </header>

              {qItems.length === 0 ? (
                <p className="px-1 py-2 text-xs text-text-muted">Brak zadań</p>
              ) : (
                <div className="todo-focus-grid">
                  {qItems.map((item) => (
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
                        <p className="text-[length:var(--todo-row-title-size)] font-[number:var(--todo-row-title-weight)] leading-snug text-text-primary">{item.title}</p>
                        {(item.due_date || item.duration_minutes) && (
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                            {item.due_date && <span>{item.due_date}</span>}
                            {item.duration_minutes && (
                              <span>
                                {item.duration_minutes < 60
                                  ? `${item.duration_minutes} min`
                                  : `${Math.floor(item.duration_minutes / 60)} h${item.duration_minutes % 60 ? ` ${item.duration_minutes % 60} min` : ''}`}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      {/* Touch: a native picker behind an icon; desktop moves tasks by drag. */}
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary sm:hidden">
                        <ArrowRightLeft size={16} aria-hidden="true" />
                        <ControlSelect
                          value={quadrantOf(item)}
                          onChange={(e) => {
                            const target = QUADRANTS.find((x) => x.key === e.target.value);
                            if (target) moveToQuadrant(item, target);
                          }}
                          aria-label={`Przenieś zadanie: ${item.title}`}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        >
                          {QUADRANTS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                        </ControlSelect>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
