/**
 * @component TodoCardSubtasks
 * @role Checklist podzadań (child tasks) — liść łańcucha TodoCardConnected -> TodoCard -> TodoCardExpandedPanel.
 * @usedBy TodoCardExpandedPanel
 */
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { TodoItemRow } from '../../lib/todo/todo';

interface TodoCardSubtasksProps {
  childTasks: TodoItemRow[];
  onAddChildTask?: (title: string) => void;
  onToggleChildTask?: (child: TodoItemRow) => void;
}

export default function TodoCardSubtasks({ childTasks, onAddChildTask, onToggleChildTask }: TodoCardSubtasksProps) {
  const [newChildTask, setNewChildTask] = useState('');

  if (!onAddChildTask) return null;

  return (
    <div className="border-t border-border-custom/20 pt-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-2xs font-black uppercase tracking-wider text-text-muted/60">Podzadania ({childTasks.filter(c => c.status === 'done').length}/{childTasks.length})</span>
      </div>

      {childTasks.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-primary/20 ml-1">
          {childTasks.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 rounded-xl border border-border-custom/20 bg-surface-solid/30 px-3 py-1.5 transition-all hover:bg-surface-solid/50"
            >
              <Pressable onClick={() => onToggleChildTask?.(child)} className="shrink-0 btn-press">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    child.status === 'done' ? 'bg-success border-success scale-105' : 'border-border-custom hover:border-primary'
                  }`}
                >
                  {child.status === 'done' && <Check size={9} className="text-on-accent" strokeWidth={3.5} />}
                </div>
              </Pressable>
              <span
                className={`min-w-0 flex-1 text-xs font-semibold tracking-tight truncate ${
                  child.status === 'done' ? 'line-through text-text-muted/50' : 'text-text-primary'
                }`}
              >
                {child.title}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <ControlInput
          placeholder="Dodaj podzadanie w stylu Apple Reminders…"
          value={newChildTask}
          onChange={e => setNewChildTask(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newChildTask.trim()) {
              onAddChildTask(newChildTask);
              setNewChildTask('');
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-border-custom/40 bg-surface-solid/40 px-3 py-1.5 text-xs font-medium text-text-primary outline-none placeholder:text-text-muted/40 focus:border-primary/40 transition-colors"
        />
        <Pressable
          onClick={() => {
            if (newChildTask.trim()) {
              onAddChildTask(newChildTask);
              setNewChildTask('');
            }
          }}
          disabled={!newChildTask.trim()}
          className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-black text-primary disabled:opacity-[var(--opacity-30)] hover:bg-primary/20 transition-colors btn-press"
        >
          Dodaj
        </Pressable>
      </div>
    </div>
  );
}
