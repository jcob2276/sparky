import { useState } from 'react';
import { Circle, ListTodo, Plus, ArrowRight, Zap } from 'lucide-react';
import type { GrowthTaskItem } from '../../lib/growth/growth.types';
import { updateTodoItem } from '../../lib/todo/todo';
import { addProjectActionToTopFive } from '../../lib/dailyTopFive';
import { getTodayWarsaw } from '../../lib/date';
import { notify } from '../../lib/notify';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  userId: string;
  tasks: GrowthTaskItem[];
  onRefresh: () => void;
  onNavigateToTodo: () => void;
}

export function GrowthTasksSection({ userId, tasks, onRefresh, onNavigateToTodo }: Props) {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  async function handleToggleDone(task: GrowthTaskItem) {
    setLoadingTaskId(task.id);
    try {
      await updateTodoItem(task.id, {
        status: 'done',
        completed_at: new Date().toISOString(),
      });
      notify(`Zadanie "${task.title}" ukończone!`, 'success');
      onRefresh();
    } catch {
      notify('Nie udało się zapisać statusu zadania.', 'error');
    } finally {
      setLoadingTaskId(null);
    }
  }

  async function handleAddToTopFive(task: GrowthTaskItem) {
    setLoadingTaskId(task.id);
    try {
      await addProjectActionToTopFive(
        userId,
        getTodayWarsaw(),
        task.title,
        task.project_id || '',
        'duch',
      );
      notify(`Dodano "${task.title}" do Top 5 na dziś!`, 'success');
      onRefresh();
    } catch {
      notify('Nie udało się dodać do Top 5.', 'error');
    } finally {
      setLoadingTaskId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-border-custom/80 bg-surface/70 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
            <ListTodo size={18} />
          </div>
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Praktyka & Zadania (SSOT Todo)</p>
            <h3 className="text-sm font-bold text-text-primary">Następne Kroki w Nauce</h3>
          </div>
        </div>
        <Pressable
          onClick={onNavigateToTodo}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <span>Otwórz Todo</span>
          <ArrowRight size={13} />
        </Pressable>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom p-6 text-center space-y-3">
          <p className="text-xs text-text-muted">
            Brak otwartych zadań związanych z projektami rozwoju. Dodaj konkretne działanie (np. "Przeczytać rozdział 3", "Napisać skrypt testowy").
          </p>
          <Pressable
            onClick={onNavigateToTodo}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface border border-border-custom px-3.5 py-2 text-xs font-black text-text-primary hover:border-primary transition-colors"
          >
            <Plus size={14} />
            <span>Dodaj zadanie w Todo</span>
          </Pressable>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 5).map((t) => {
            const isLoading = loadingTaskId === t.id;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-custom/60 bg-background/50 p-3 hover:border-border-custom transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Pressable
                    onClick={() => void handleToggleDone(t)}
                    disabled={isLoading}
                    className="text-text-muted hover:text-success shrink-0 transition-colors"
                  >
                    {isLoading ? (
                      <Circle size={18} className="animate-spin text-primary" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </Pressable>
                  <span className="text-sm font-semibold text-text-primary truncate">{t.title}</span>
                </div>

                <Pressable
                  onClick={() => void handleAddToTopFive(t)}
                  disabled={isLoading}
                  className="flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1 text-2xs font-bold text-primary hover:bg-primary/20 shrink-0 transition-colors"
                >
                  <Zap size={11} />
                  <span>+ Top 5</span>
                </Pressable>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
