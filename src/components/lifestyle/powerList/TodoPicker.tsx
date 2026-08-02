import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import Badge from '../../ui/Badge';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { GroupedList, GroupedListRow } from '../../ui/GroupedList';
import { getTodayWarsaw } from '../../../lib/date';
import type { TodoItemRow } from '../../../lib/todo/todo';
import { PRIORITY_DOT } from './powerListConstants';

interface TodoPickerProps {
  items: TodoItemRow[];
  onSelect: (item: TodoItemRow) => void;
  onClose: () => void;
}

export default function TodoPicker({ items, onSelect, onClose }: TodoPickerProps) {
  const [search, setSearch] = useState('');
  const today = getTodayWarsaw();
  const filtered = search
    ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : items;
  const limited = filtered.slice(0, 20);
  const groups = [
    { label: 'Dzisiaj', items: limited.filter((item) => item.due_date === today) },
    { label: 'Zaległe', items: limited.filter((item) => item.due_date !== null && item.due_date < today) },
    { label: 'Bez daty', items: limited.filter((item) => item.due_date === null) },
    { label: 'Później', items: limited.filter((item) => item.due_date !== null && item.due_date > today) },
  ].filter((group) => group.items.length > 0);

  return (
    <div
      role="dialog"
      aria-label="Wybierz zadanie z To-do"
      data-material="floating"
      className="ui-floating-layer ui-todo-picker"
    >
      <div className="flex items-center gap-2 border-b border-border-custom px-3">
        <Search size={15} className="shrink-0 text-text-muted" aria-hidden="true" />
        <ControlInput
          autoFocus
          aria-label="Szukaj zadań"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onClose()}
          placeholder="Szukaj zadania…"
          className="min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-text-primary shadow-none placeholder:text-text-muted"
        />
      </div>
      <p className="border-b border-border-custom px-3 py-2 text-xs leading-relaxed text-text-muted">
        Wybór tylko łączy zadanie z planem. Data i miejsce w To-do zostają bez zmian.
      </p>

      <div className="max-h-[var(--ds-h-188px)] space-y-3 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-5 text-center text-sm text-text-muted">Brak otwartych zadań</p>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-labelledby={`todo-group-${group.label}`}>
              <h3 id={`todo-group-${group.label}`} className="ios-section-label mb-1 px-2">
                {group.label}
              </h3>
              <GroupedList aria-label={group.label}>
                {group.items.map((item) => (
                  <GroupedListRow key={item.id} className="p-0">
                    <Pressable
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="flex min-h-12 w-full items-center gap-2.5 px-3 text-left"
                    >
                      {item.category ? (
                        <Badge variant="tag" className="shrink-0">
                          <BookOpen size={9} aria-hidden="true" /> {item.category}
                        </Badge>
                      ) : (
                        <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[item.priority] || 'bg-info'}`} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                        {item.title}
                      </span>
                      {item.due_date && item.due_date !== today && (
                        <span className="shrink-0 text-xs text-text-muted">{item.due_date}</span>
                      )}
                    </Pressable>
                  </GroupedListRow>
                ))}
              </GroupedList>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
