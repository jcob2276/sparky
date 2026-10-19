import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTodoContext } from '../context/TodoContext';
import { updateTodoItem } from '../../../lib/todo/todo';
import { applyOptimisticPatch } from '../todoOptimistic';
import { TODO_QUICK_ADD_EVENT } from './useTodoKeyboard';
import {
  navigateTodo, navigateToSectionEntry, revealTodo, switchTodoView, toggleTodoCalendar,
} from '../todoPaletteNav';
import type { PaletteHandlers, PaletteMode } from '../todoPaletteEntries';

interface Params {
  close: () => void;
  setMode: Dispatch<SetStateAction<PaletteMode>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setActiveIndex: Dispatch<SetStateAction<number>>;
}

/** What each palette entry does. Moves are optimistic and roll back through applyOptimisticPatch. */
export function useTodoPaletteHandlers({ close, setMode, setQuery, setActiveIndex }: Params): PaletteHandlers {
  const { items, setItems, setError, setExpandedId, setActiveFilterSection } = useTodoContext();
  return useMemo<PaletteHandlers>(() => ({
    newTask: () => { close(); window.setTimeout(() => window.dispatchEvent(new CustomEvent(TODO_QUICK_ADD_EVENT)), 0); },
    startMove: () => { setMode({ kind: 'pick-task' }); setQuery(''); setActiveIndex(0); },
    setView: (view) => { close(); switchTodoView(view); },
    goTo: (target) => { close(); window.setTimeout(() => { switchTodoView('lista'); navigateTodo(target); }, 20); },
    goToSection: (section) => {
      close();
      window.setTimeout(() => {
        switchTodoView('lista');
        setActiveFilterSection(section.id);
        navigateToSectionEntry(section.name);
      }, 20);
    },
    toggleCalendar: () => { close(); toggleTodoCalendar(); },
    openTask: (taskId) => {
      const task = items.find((i) => i.id === taskId);
      close();
      switchTodoView('lista');
      setActiveFilterSection(null);
      setExpandedId(taskId);
      revealTodo(taskId, task?.status === 'done', setExpandedId);
    },
    pickTaskToMove: (task) => {
      setMode({ kind: 'pick-section', taskId: task.id, taskTitle: task.title, currentSectionId: task.section_id });
      setQuery('');
      setActiveIndex(0);
    },
    moveTask: (taskId, sectionId) => {
      const original = items.find((i) => i.id === taskId);
      close();
      if (!original || original.section_id === sectionId) return;
      applyOptimisticPatch(setItems, original, { section_id: sectionId }, () => updateTodoItem(taskId, { section_id: sectionId }), setError);
    },
  }), [close, items, setActiveFilterSection, setActiveIndex, setError, setExpandedId, setItems, setMode, setQuery]);

}
