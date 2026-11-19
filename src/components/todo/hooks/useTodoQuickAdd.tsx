import { Pressable } from '../../ui/ControlPrimitives';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTodoContext } from '../context/TodoContext';
import TodoQuickCapture from '../TodoQuickCapture';
import TodoInlineCapture from '../TodoInlineCapture';
import type { AddTodoOptions } from './useTodoQuickCapture';

import { TODO_QUICK_ADD_EVENT } from './useTodoKeyboard';

export function useTodoQuickAdd() {
  const {
    quickCaptureRef, form, setForm, isExpanded, setIsExpanded,
    busy, addItem, addBrainDump, sections, parsedInput, today,
  } = useTodoContext();

  const [activeAddSectionId, setActiveAddSectionId] = useState<string | null>(null);
  const [scanTextOpen, setScanTextOpen] = useState(false);
  // The add row is inline; "Więcej" swaps it for the full form (modal) with the same draft.
  const [fullForm, setFullForm] = useState(false);

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

  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const requestedNewTask = pathname === '/todo' && params.get('new') === '1';
  const autoNewTaskHandled = useRef(false);
  useEffect(() => {
    if (!requestedNewTask) {
      autoNewTaskHandled.current = false;
      return;
    }
    if (autoNewTaskHandled.current) return;
    autoNewTaskHandled.current = true;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('new');
      return next;
    }, { replace: true });
    openQuickAddRef.current('today');
  }, [requestedNewTask, setParams]);

  const closeCapture = () => {
    setIsExpanded(false);
    setActiveAddSectionId(null);
    setFullForm(false);
  };

  const renderInlineQuickCapture = (sectionId: string) => {
    if (activeAddSectionId !== sectionId) return null;
    if (!fullForm) {
      return (
        <TodoInlineCapture
          captureRef={quickCaptureRef}
          form={form}
          setForm={setForm}
          parsedInput={parsedInput}
          today={today}
          busy={busy}
          addItem={(options?: AddTodoOptions) => {
            addItem({ ...options, sections });
            if (!options?.keepOpen) closeCapture();
          }}
          onCancel={closeCapture}
          onMore={() => setFullForm(true)}
        />
      );
    }
    return (
      <div className="pt-2">
        <TodoQuickCapture
          quickCaptureRef={quickCaptureRef}
          form={form}
          setForm={setForm}
          isExpanded={isExpanded}
          setIsExpanded={(val: boolean) => {
            if (val) setIsExpanded(true); else closeCapture();
          }}
          busy={busy}
          addItem={(options?: AddTodoOptions) => {
            addItem({ ...options, sections });
            if (!options?.keepOpen) closeCapture();
          }}
          sections={sections}
          parsedInput={parsedInput}
          today={today}
          onOpenScanText={() => setScanTextOpen(true)}
          onBrainDump={async (text) => {
            const count = await addBrainDump(text, sections);
            if (count > 0) closeCapture();
            return count;
          }}
        />
      </div>
    );
  };

  const renderAddTodoButton = (sectionId: string) => {
    if (activeAddSectionId === sectionId) return null;
    return (
      <Pressable
        onClick={() => openQuickAdd(sectionId)}
        className="group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-secondary hover:bg-surface-solid hover:text-primary"
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
