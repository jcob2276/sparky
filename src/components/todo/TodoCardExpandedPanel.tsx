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
  const locationInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const linkedNoteId = sourceNoteId(item.notes);
  const tags = item.tags || [];
  const quickSuggestedTags = ['studia', 'praca', 'dom', 'ważne', 'finanse'].filter(t => !tags.includes(t));
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
        <div className={`${ROW} cursor-pointer hover:bg-surface-2/40 transition-colors`}>
          <span className="flex items-center gap-2 font-medium"><FolderInput size={16} className="text-text-secondary" aria-hidden="true" />Lista</span>
          <ControlSelect value={item.section_id || ''} onChange={(e) => onMoveSection(e.target.value || null)} className={SELECT}>
            <option value="">Skrzynka</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </ControlSelect>
        </div>
        <div className={DIVIDER} />
        <div className="px-3 py-2.5">
          <div className="flex min-h-9 items-center justify-between text-sm text-text-primary">
            <span className="flex items-center gap-2 font-medium"><Tag size={16} className="text-text-secondary" aria-hidden="true" />Tagi</span>
            <Pressable
              type="button"
              onClick={() => tagInputRef.current?.focus()}
              className="text-xs text-primary font-semibold hover:underline"
            >
              + Dodaj
            </Pressable>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-6">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                #{tag}
                <Pressable aria-label={`Usuń tag ${tag}`} onClick={() => onSetTags(tags.filter((t) => t !== tag))} className="text-text-muted hover:text-danger ml-0.5"><X size={11} aria-hidden="true" /></Pressable>
              </span>
            ))}
            <ControlInput
              ref={tagInputRef}
              value={tagInput}
              placeholder="Wpisz tag i naciśnij Enter…"
              aria-label="Dodaj tag"
              onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[\s#]/g, '_'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  const t = tagInput.trim();
                  if (!tags.includes(t)) onSetTags([...tags, t]);
                  setTagInput('');
                }
              }}
              className="min-h-8 min-w-32 flex-1 rounded-lg border border-border-custom/30 bg-surface-2/40 px-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary/50"
            />
          </div>
          {quickSuggestedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
              <span className="text-2xs text-text-muted mr-1">Szybkie:</span>
              {quickSuggestedTags.slice(0, 4).map((st) => (
                <Pressable
                  key={st}
                  type="button"
                  onClick={() => onSetTags([...tags, st])}
                  className="rounded-full bg-surface-2/60 hover:bg-surface-2 px-2 py-0.5 text-2xs font-medium text-text-secondary hover:text-text-primary active:scale-95 transition-all"
                >
                  +{st}
                </Pressable>
              ))}
            </div>
          )}
        </div>
        <div className={DIVIDER} />
        <TodoSwitchRow icon={Flag} label="Flaga" checked={Boolean(item.is_important)} onChange={(on) => onSetImportant?.(on)} />
        <div className={DIVIDER} />
        <div className={`${ROW} cursor-pointer hover:bg-surface-2/40 transition-colors`}>
          <span className="flex items-center gap-2 font-medium"><AlertCircle size={16} className="text-text-secondary" aria-hidden="true" />Priorytet</span>
          <ControlSelect value={item.priority || 'normal'} onChange={(e) => onSetPriority(e.target.value)} className={SELECT}>
            <option value="urgent">P1 · Pilne</option><option value="high">P2 · Ważne</option>
            <option value="normal">P3 · Normalne</option><option value="low">P4 · Niskie</option>
          </ControlSelect>
        </div>
      </div>

      <div className="ios-glass-group">
        <div
          onClick={() => locationInputRef.current?.focus()}
          className={`${ROW} cursor-text hover:bg-surface-2/40 transition-colors`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap font-medium"><MapPin size={16} className="text-text-secondary" aria-hidden="true" />Miejsce</span>
          <ControlInput
            ref={locationInputRef}
            value={locationDraft}
            maxLength={200}
            placeholder="Brak"
            autoComplete="off"
            onChange={(e) => setLocationDraft(e.target.value)}
            onBlur={() => { if (locationDraft.trim() !== (item.location_name || '')) onSetLocation?.(locationDraft.trim() || null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className={`${FIELD} flex-1 text-right placeholder:text-text-muted`}
          />
          {item.location_name ? (
            <a href={`https://maps.apple.com/?q=${encodeURIComponent(item.location_name)}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">Mapy</a>
          ) : null}
        </div>
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
