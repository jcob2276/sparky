/**
 * @component TodoCardExpandedPanel
 * @role Formularz edycji rozwiniętej karty (notatki, termin, priorytet, tagi, załączniki).
 * @composes TodoCardSubtasks (checklist podzadań)
 * @usedBy TodoCard (renderowany gdy expanded=true)
 */
import { Pressable, ControlInput, ControlSelect, ControlTextarea } from '../ui/ControlPrimitives';
import React, { useState } from 'react';
import { Paperclip, X, Tag, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TodoTaskTimingControls from './TodoTaskTimingControls';
import TodoCardSubtasks from './TodoCardSubtasks';
import type { useTodoCardAttachments } from './useTodoCardAttachments';
import type { TodoItemRow, TodoAttachmentRow } from '../../lib/todo/todo';
import { sourceNoteId } from '../../lib/behavior/captureBridge';

interface TodoCardExpandedPanelProps {
  item: TodoItemRow;
  onSetNotes?: (notes: string | null) => void;
  onSetSchedule: (patch: { due_date?: string | null; scheduled_time?: string | null }) => void;
  onSetRecurrence: (recurrence: string | null) => void;
  onSetDeadline: (date: string | null) => void;
  onSetPriority: (p: string) => void;
  onSetReminder: (isoDatetime: string) => void;
  onSetTags: (tags: string[]) => void;
  onMoveSection: (sId: string | null) => void;
  onDrop: () => void;
  onToggleExpand: (id: string) => void;
  sections: { id: string; name: string }[];
  today: string;
  childTasks: TodoItemRow[];
  onAddChildTask?: (title: string) => void;
  onToggleChildTask?: (child: TodoItemRow) => void;
  attachments: ReturnType<typeof useTodoCardAttachments>['attachments'];
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (file: File) => void;
  handleDeleteAttachment: (att: TodoAttachmentRow) => void;
}

export default function TodoCardExpandedPanel({
  item, onSetNotes,
  onSetPriority, onSetReminder, onSetTags, onSetSchedule, onSetRecurrence, onSetDeadline, onMoveSection, onDrop, onToggleExpand, sections, today,
  childTasks, onAddChildTask, onToggleChildTask, attachments, uploadingFile, fileInputRef,
  handleFileUpload, handleDeleteAttachment
}: TodoCardExpandedPanelProps) {
  const [openPopover, setOpenPopover] = useState<'date' | 'reminder' | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [notesDraft, setNotesDraft] = useState(item.notes || '');
  const navigate = useNavigate();
  const linkedNoteId = sourceNoteId(item.notes);

  return (
    <div onClick={e => e.stopPropagation()} className="todo-focus-details">
      <label className="text-xs font-semibold text-text-secondary">Notatka
        <ControlTextarea
          value={notesDraft}
          onChange={e => setNotesDraft(e.target.value)}
          onBlur={() => {
            if (notesDraft !== (item.notes || '')) onSetNotes?.(notesDraft || null);
          }}
          rows={3}
          placeholder="Dodaj kontekst do zadania…"
          className="mt-2 block min-h-20 w-full resize-y rounded-lg border border-border-custom bg-surface-solid px-3 py-2 text-sm font-normal text-text-primary focus-visible:shadow-focus"
        />
      </label>

      {/* Attachments inline tags list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-lg border border-border-custom/50 bg-surface-solid/40 px-2 py-0.5 text-xs"
            >
              <Paperclip size={10} className="text-text-muted/50" />
              <a
                href={att.file_url}
                target="_blank"
                rel="noreferrer"
                className="max-w-[var(--ds-maxw-120px)] truncate text-primary hover:underline"
              >
                {att.file_name}
              </a>
              <Pressable
                onClick={() => handleDeleteAttachment(att)}
                className="text-text-muted/35 hover:text-danger transition-colors ml-0.5"
              >
                <X size={10} />
              </Pressable>
            </div>
          ))}
        </div>
      )}

      {/* Subtasks */}
      <TodoCardSubtasks
        childTasks={childTasks}
        onAddChildTask={onAddChildTask}
        onToggleChildTask={onToggleChildTask}
      />

      {/* Button chips row (Termin, Załącznik, Priorytet, Przypomnienia, Tagi) */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border-custom/20 pt-2.5">
        {linkedNoteId && (
          <Pressable
            type="button"
            onClick={() => navigate(`/keep?note=${linkedNoteId}`)}
            className="todo-instant flex min-h-11 items-center gap-1.5 rounded-lg border border-border-custom/80 px-2.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-text-primary/[0.04]"
          >
            <StickyNote size={12} className="text-primary" /> Notatka źródłowa
          </Pressable>
        )}
        <TodoTaskTimingControls item={item} today={today} openPopover={openPopover} setOpenPopover={setOpenPopover} onSetSchedule={onSetSchedule} onSetDeadline={onSetDeadline} onSetRecurrence={onSetRecurrence} onSetReminder={onSetReminder} />

        {/* Attachment button */}
        <div className="relative">
          <ControlInput
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Pressable
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="todo-instant flex min-h-11 items-center gap-1.5 rounded-lg border border-border-custom/80 px-2.5 py-2 text-xs font-semibold text-text-secondary hover:bg-text-primary/[0.04] ui-interactive disabled:opacity-[var(--opacity-40)]"
          >
            <Paperclip size={12} className="text-text-muted/60" />
            <span>{uploadingFile ? 'Wysyłanie…' : 'Załącznik'}</span>
          </Pressable>
        </div>

        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">Priorytet
          <ControlSelect value={item.priority || 'normal'} onChange={event => onSetPriority(event.target.value)}
            className="todo-instant min-h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-2 text-sm text-text-primary focus-visible:shadow-focus">
            <option value="urgent">P1 · Pilne</option><option value="high">P2 · Ważne</option>
            <option value="normal">P3 · Normalne</option><option value="low">P4 · Niskie</option>
          </ControlSelect>
        </label>

        {/* Tags input chip */}
        <div className="flex min-h-11 items-center gap-1 border border-border-custom/80 rounded-lg px-2 py-0.5 max-w-[var(--ds-maxw-150px)]">
          <Tag size={11} className="text-text-muted/60" />
          <ControlInput
            value={tagInput}
            placeholder="Tagi"
            onChange={e => setTagInput(e.target.value.toLowerCase().replace(/[\s#]/g, '_'))}
            onKeyDown={e => {
              if (e.key === 'Enter' && tagInput.trim()) {
                const t = tagInput.trim();
                if (!(item.tags || []).includes(t)) onSetTags([...(item.tags || []), t]);
                setTagInput('');
              }
            }}
            className="bg-transparent text-xs font-semibold text-text-secondary outline-none w-full placeholder:text-text-muted/30"
          />
        </div>

        {/* Tag tags list */}
        {(item.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(item.tags || []).map((tag: string) => (
              <span key={tag} className="flex items-center gap-1 rounded-full border border-border-custom/50 bg-surface-solid/60 px-2 py-0.5 text-2xs font-medium text-text-secondary">
                #{tag}
                <Pressable
                  onClick={() => onSetTags((item.tags || []).filter((t: string) => t !== tag))}
                  className="text-text-muted/40 hover:text-danger transition-colors ml-0.5"
                >
                  <X size={9} />
                </Pressable>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-custom/80 pt-3 mt-1.5">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">Sekcja
          <ControlSelect value={item.section_id || ''} onChange={event => onMoveSection(event.target.value || null)}
            className="todo-instant min-h-11 w-full rounded-lg border border-border-custom bg-surface-solid px-2 text-sm text-text-primary focus-visible:shadow-focus">
            <option value="">Skrzynka</option>{sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
          </ControlSelect>
        </label>

        {/* Right: Actions */}
        <div className="flex gap-2">
          <Pressable
            type="button"
            onClick={onDrop}
            className="todo-instant min-h-11 rounded-xl border border-danger/15 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
          >
            Odpuść zadanie
          </Pressable>
          <Pressable
            variant="primary"
            size="sm"
            onClick={() => onToggleExpand(item.id)}
          >
            Zamknij
          </Pressable>
        </div>
      </div>
    </div>
  );
}
