import { Pressable } from '../../ui/ControlPrimitives';
import { useEffect, useRef, useState } from 'react';
import { useTodoContext } from '../context/TodoContext';
import TodoQuickCapture from '../TodoQuickCapture';
import type { AddTodoOptions } from './useTodoQuickCapture';

import { TODO_QUICK_ADD_EVENT } from './useTodoKeyboard';

export function useTodoQuickAdd() {
  const {
    quickCaptureRef, form, setForm, isExpanded, setIsExpanded,
    busy, addItem, sections, parsedInput, today,
  } = useTodoContext();

  const [activeAddSectionId, setActiveAddSectionId] = useState<string | null>(null);
  const [scanTextOpen, setScanTextOpen] = useState(false);

  const openQuickAdd = (sectionId: string) => {
    if (isExpanded) {
      // Already open: keep the draft, just return focus to the title.
      document.getElementById('todo-title-input')?.focus();
      return;
    }
    setActiveAddSectionId(sectionId);
    setIsExpanded(true);
    const defaultDate = sectionId === 'today' ? today : '';
    const defaultSec = sectionId === 'today' || sectionId === 'inbox' ? '' : sectionId;
    setForm({
      title: '', notes: '', priority: 'normal', tagsText: '',
      due_date: defaultDate, deadline_date: '', recurrence: '', section_id: defaultSec,
      scheduled_time: '', reminder_at: '',
    });
    window.setTimeout(() => {
      quickCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      quickCaptureRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    }, 50);
  };

  // Keyboard shortcut ("n") dispatched by useTodoKeyboard.
  const openQuickAddRef = useRef(openQuickAdd);
  useEffect(() => { openQuickAddRef.current = openQuickAdd; });
  useEffect(() => {
    const handler = () => openQuickAddRef.current('today');
    window.addEventListener(TODO_QUICK_ADD_EVENT, handler);
    return () => window.removeEventListener(TODO_QUICK_ADD_EVENT, handler);
  }, []);

  // Auto-open quick capture when navigated with ?new=1 (PWA shortcut / Telegram)
  const autoNewTaskHandled = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1' && !autoNewTaskHandled.current) {
      autoNewTaskHandled.current = true;
      window.history.replaceState({}, '', window.location.pathname);
      setActiveAddSectionId('today');
      setIsExpanded(true);
      setForm({
        title: '', notes: '', priority: 'normal', tagsText: '',
        due_date: today, deadline_date: '', recurrence: '', section_id: '',
        scheduled_time: '', reminder_at: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderInlineQuickCapture = (sectionId: string) => {
    if (activeAddSectionId !== sectionId) return null;
    return (
      <div className="pt-2">
        <TodoQuickCapture
          quickCaptureRef={quickCaptureRef}
          form={form}
          setForm={setForm}
          isExpanded={isExpanded}
          setIsExpanded={(val: boolean) => {
            setIsExpanded(val);
            if (!val) setActiveAddSectionId(null);
          }}
          busy={busy}
          addItem={(options?: AddTodoOptions) => {
            addItem({ ...options, sections });
            if (!options?.keepOpen) setActiveAddSectionId(null);
          }}
          sections={sections}
          parsedInput={parsedInput}
          today={today}
          onOpenScanText={() => setScanTextOpen(true)}
        />
      </div>
    );
  };

  const renderAddTodoButton = (sectionId: string) => {
    if (activeAddSectionId === sectionId) return null;
    return (
      <Pressable
        onClick={() => openQuickAdd(sectionId)}
        className="group mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary hover:bg-surface-solid hover:text-primary"
      >
        <span className="flex h-5 w-5 items-center justify-center text-lg leading-none group-hover:text-primary" aria-hidden="true">+</span>
        <span>Dodaj zadanie</span>
      </Pressable>
    );
  };

  return {
    activeAddSectionId, setActiveAddSectionId,
    scanTextOpen, setScanTextOpen,
    openQuickAdd,
    renderInlineQuickCapture, renderAddTodoButton,
  };
}
