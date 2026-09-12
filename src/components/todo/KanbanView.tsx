import { updateTodoItem } from '../../lib/todo/todo';
import { PRIORITY, PRIORITY_ORDER } from './todoUtils';
import { Card } from '../ui/Card';
import { Check } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

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

  const columns: Array<{ id: string | null; title: string; icon: string }> = [
    { id: null, title: 'Skrzynka', icon: '📥' },
    ...sections.map((s) => ({ id: s.id, title: s.name, icon: '📂' })),
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
      <span className={`text-2xs font-bold ${overdue ? 'text-danger' : isToday ? 'text-warning' : 'text-text-muted'}`}>
        {isToday ? 'Dziś' : overdue ? `⚠ ${item.due_date}` : item.due_date}
      </span>
    );
  };

  return (
    <div className="flex h-full overflow-x-auto overflow-y-hidden pb-20 px-4 pt-4 gap-3">
      {columns.map((col) => {
        const colItems = open
          .filter((i) => i.section_id === col.id)
          .sort((a, b) => PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority));

        return (
          <div
            key={String(col.id)}
            className="flex-shrink-0 w-[var(--ds-w-220px)] flex flex-col rounded-2xl bg-surface/40 border border-border-custom/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              const item = items.find((i) => i.id === id);
              if (item) moveToSection(item, col.id);
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-custom/30">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{col.icon}</span>
                <span className="text-sm font-bold text-text-primary">{col.title}</span>
              </div>
              {colItems.length > 0 && (
                <span className="text-xs font-black text-text-muted bg-surface-solid px-1.5 py-0.5 rounded-full">
                  {colItems.length}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colItems.map((item) => {
                const pMeta = PRIORITY[item.priority as keyof typeof PRIORITY];
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                    className="rounded-xl border border-border-custom/40 bg-background/70 px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-border-custom transition-all group hover:bg-surface-solid"
                  >
                    <div className="flex items-start gap-2">
                      <Pressable
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask(item.id);
                        }}
                        className="mt-0.5 shrink-0 btn-press cursor-pointer"
                        aria-label={`Oznacz jako wykonane: ${item.title}`}
                      >
                        <div className="h-3.5 w-3.5 rounded-full border border-border-custom hover:border-success hover:bg-success/15 flex items-center justify-center transition-colors">
                          <Check size={8} className="opacity-0 group-hover:opacity-70 text-success" />
                        </div>
                      </Pressable>
                      <p className="text-xs font-semibold text-text-primary leading-snug line-clamp-3 flex-1">{item.title}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pl-5">
                      <span className={`text-2xs font-black px-1.5 py-0.5 rounded-full ${pMeta?.chip ?? 'bg-surface-solid text-text-muted'}`}>
                        {pMeta?.label ?? item.priority}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.duration_minutes && (
                          <span className="text-2xs text-warning font-semibold">
                            {item.duration_minutes < 60
                              ? `${item.duration_minutes}m`
                              : `${Math.floor(item.duration_minutes / 60)}h`}
                          </span>
                        )}
                        {dueBadge(item)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colItems.length === 0 && (
                <Card variant="surface" padding="1rem" style={{ boxShadow: 'none' }} className="!bg-transparent !rounded-xl border border-dashed border-border-custom/20 text-center">
                  <p className="text-2xs text-text-muted/40">Przeciągnij tutaj</p>
                </Card>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
