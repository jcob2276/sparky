/**
 * @component TodoCardExpandedPanel
 * @role Treść okna szczegółów zadania (liquid glass): tytuł, notatki, data i godzina, organizacja, miejsce, podzadania, załączniki.
 * @composes TodoCardSubtasks (checklist podzadań)
 * @usedBy TodoCard (renderowany w TodoDetailsPopover gdy expanded=true)
 */
import { Pressable, ControlInput, ControlSelect, ControlTextarea } from '../ui/ControlPrimitives';
import React, { useRef, useState } from 'react';
import { Camera, Flag, FolderInput, MapPin, Paperclip, StickyNote, Tag, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TodoDateTimeGroup, TodoScheduleExtras, DIVIDER, ROW, type TimingPopover } from './TodoTaskTimingControls';
import TodoSwitchRow from './TodoSwitchRow';
import TodoCardSubtasks from './TodoCardSubtasks';
import type { useTodoCardAttachments } from './useTodoCardAttachments';
import type { TodoItemRow, TodoAttachmentRow } from '../../lib/todo/todo';
import { sourceNoteId } from '../../lib/behavior/captureBridge';

interface TodoCardExpandedPanelProps {
  item: TodoItemRow;
  onSetTitle?: (title: string) => void;
  onSetNotes?: (notes: string | null) => void;
  onSetLocation?: (name: string | null) => void;
  onSetImportant?: (important: boolean) => void;
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

const FIELD = 'todo-instant min-h-11 min-w-0 rounded-none border-0 bg-transparent px-0 text-sm text-text-secondary';
const SELECT = `${FIELD} w-40 justify-end gap-1 [&>span]:text-right`;
const PILL = 'todo-instant flex min-h-9 items-center gap-1.5 rounded-full bg-text-primary/[0.07] px-3 text-xs font-medium text-text-secondary disabled:opacity-[var(--opacity-40)]';

export default function TodoCardExpandedPanel({
  item, onSetTitle, onSetNotes, onSetLocation, onSetImportant,
  onSetPriority, onSetReminder, onSetTags, onSetSchedule, onSetRecurrence, onSetDeadline, onMoveSection, onDrop, onToggleExpand, sections, today,
  childTasks, onAddChildTask, onToggleChildTask, attachments, uploadingFile, fileInputRef,
  handleFileUpload, handleDeleteAttachment,
}: TodoCardExpandedPanelProps) {
  const [openPopover, setOpenPopover] = useState<TimingPopover>(null);
  const [tagInput, setTagInput] = useState('');
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [notesDraft, setNotesDraft] = useState(item.notes || '');
  const [locationDraft, setLocationDraft] = useState(item.location_name || '');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const linkedNoteId = sourceNoteId(item.notes);
  const tags = item.tags || [];
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="contents">
      <div className="flex items-start gap-2 px-1">
        <ControlInput aria-label="Tytuł zadania" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => { const next = titleDraft.trim(); if (next && next !== item.title) onSetTitle?.(next); else setTitleDraft(item.title); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="ios-glass-title todo-instant min-h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-xl font-semibold leading-tight tracking-tight text-text-primary" />
        <Pressable aria-label="Zamknij szczegóły" onClick={() => onToggleExpand(item.id)}
          className="todo-instant flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-primary/[0.08] text-text-secondary">
          <X size={16} aria-hidden="true" />
        </Pressable>
      </div>

      <div className="ios-glass-group px-3 py-1">
        <ControlTextarea aria-label="Notatki" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => { if (notesDraft !== (item.notes || '')) onSetNotes?.(notesDraft || null); }}
          rows={2} placeholder="Notatki"
          className="block min-h-14 w-full resize-none rounded-none border-0 bg-transparent px-0 py-2 text-sm font-normal text-text-primary placeholder:text-text-muted" />
        {linkedNoteId && (
          <Pressable type="button" onClick={() => navigate(`/keep?note=${linkedNoteId}`)} className="todo-instant mb-2 flex min-h-9 items-center gap-1.5 text-xs font-medium text-primary">
            <StickyNote size={12} aria-hidden="true" /> Notatka źródłowa
          </Pressable>
        )}
      </div>

      <TodoDateTimeGroup item={item} today={today} onSetSchedule={onSetSchedule} />

      <div className="ios-glass-group">
        <label className={ROW}>
          <span className="flex items-center gap-2"><FolderInput size={16} className="text-text-secondary" aria-hidden="true" />Lista</span>
          <ControlSelect value={item.section_id || ''} onChange={(e) => onMoveSection(e.target.value || null)} className={SELECT}>
            <option value="">Skrzynka</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </ControlSelect>
        </label>
        <div className={DIVIDER} />
        <div className="px-3 py-2">
          <div className="flex min-h-9 items-center gap-2 text-sm text-text-primary"><Tag size={16} className="text-text-secondary" aria-hidden="true" />Tagi</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-6">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-text-primary/[0.07] px-2.5 py-1 text-xs text-text-secondary">
                #{tag}
                <Pressable aria-label={`Usuń tag ${tag}`} onClick={() => onSetTags(tags.filter((t) => t !== tag))} className="text-text-muted hover:text-danger"><X size={10} aria-hidden="true" /></Pressable>
              </span>
            ))}
            <ControlInput value={tagInput} placeholder="Dodaj tag" aria-label="Dodaj tag"
              onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[\s#]/g, '_'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  const t = tagInput.trim();
                  if (!tags.includes(t)) onSetTags([...tags, t]);
                  setTagInput('');
                }
              }}
              className="min-h-8 min-w-24 flex-1 rounded-none border-0 bg-transparent px-0 text-xs text-text-secondary placeholder:text-text-muted" />
          </div>
        </div>
        <div className={DIVIDER} />
        <TodoSwitchRow icon={Flag} label="Flaga" checked={item.is_important} onChange={(on) => onSetImportant?.(on)} />
        <div className={DIVIDER} />
        <label className={ROW}>
          <span className="flex items-center gap-2"><AlertCircle size={16} className="text-text-secondary" aria-hidden="true" />Priorytet</span>
          <ControlSelect value={item.priority || 'normal'} onChange={(e) => onSetPriority(e.target.value)} className={SELECT}>
            <option value="urgent">P1 · Pilne</option><option value="high">P2 · Ważne</option>
            <option value="normal">P3 · Normalne</option><option value="low">P4 · Niskie</option>
          </ControlSelect>
        </label>
      </div>

      <div className="ios-glass-group">
        <label className={ROW}>
          <span className="flex items-center gap-2 whitespace-nowrap"><MapPin size={16} className="text-text-secondary" aria-hidden="true" />Miejsce</span>
          <ControlInput value={locationDraft} maxLength={200} placeholder="Brak" autoComplete="off" onChange={(e) => setLocationDraft(e.target.value)}
            onBlur={() => { if (locationDraft.trim() !== (item.location_name || '')) onSetLocation?.(locationDraft.trim() || null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className={`${FIELD} flex-1 text-right placeholder:text-text-muted`} />
          {item.location_name ? (
            <a href={`https://maps.apple.com/?q=${encodeURIComponent(item.location_name)}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-primary">Mapy</a>
          ) : null}
        </label>
        <TodoScheduleExtras item={item} openPopover={openPopover} setOpenPopover={setOpenPopover}
          onSetDeadline={onSetDeadline} onSetRecurrence={onSetRecurrence} onSetReminder={onSetReminder} />
      </div>

      <TodoCardSubtasks childTasks={childTasks} onAddChildTask={onAddChildTask} onToggleChildTask={onToggleChildTask} />

      <div className="flex flex-wrap items-center gap-2 px-1">
        <ControlInput ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Zrób zdjęcie" onChange={upload} />
        <ControlInput ref={fileInputRef} type="file" className="hidden" aria-label="Dodaj załącznik" onChange={upload} />
        <Pressable type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingFile} className={PILL}>
          <Camera size={12} aria-hidden="true" />{uploadingFile ? 'Wysyłanie…' : 'Zdjęcie'}
        </Pressable>
        <Pressable type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className={PILL}>
          <Paperclip size={12} aria-hidden="true" />Załącznik
        </Pressable>
        {attachments.map((att) => (
          <span key={att.id} className="flex items-center gap-1.5 rounded-full bg-text-primary/[0.07] px-2.5 py-1 text-xs">
            <Paperclip size={10} className="text-text-muted" aria-hidden="true" />
            <a href={att.file_url} target="_blank" rel="noreferrer" className="max-w-[var(--ds-maxw-120px)] truncate text-primary hover:underline">{att.file_name}</a>
            <Pressable aria-label={`Usuń załącznik ${att.file_name}`} onClick={() => handleDeleteAttachment(att)} className="text-text-muted hover:text-danger"><X size={10} aria-hidden="true" /></Pressable>
          </span>
        ))}
      </div>

      <Pressable type="button" onClick={onDrop} className="todo-instant min-h-11 self-start rounded-lg px-1 text-sm text-danger">Odpuść zadanie</Pressable>
    </div>
  );
}
