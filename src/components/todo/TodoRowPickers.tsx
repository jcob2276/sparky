import { useState } from 'react';
import { Check, CalendarDays, CalendarPlus, CalendarX2, Flag, FolderOpen, Inbox, Search, Sofa, Sun } from 'lucide-react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { PRIORITY_OPTIONS } from './todoPriorityOptions';
import { getTodoDatePresets, weekdayShort, type TodoDatePreset } from './todoDatePresets';

const itemClass = 'todo-instant flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-focus [@media(pointer:coarse)]:min-h-11';

const PRESET_ICON: Record<TodoDatePreset['id'], { Icon: typeof Sun; tone: string }> = {
  today: { Icon: CalendarDays, tone: 'text-success' },
  tomorrow: { Icon: Sun, tone: 'text-warning' },
  weekend: { Icon: Sofa, tone: 'text-info' },
  week: { Icon: CalendarPlus, tone: 'text-primary' },
  none: { Icon: CalendarX2, tone: 'text-text-secondary' },
};

export function DatePresetsPanel({ today, dueDate, onPick }: { today: string; dueDate: string | null; onPick: (date: string | null) => void }) {
  return (
    <div role="group" aria-label="Termin">
      {getTodoDatePresets(today).map((preset) => {
        const { Icon, tone } = PRESET_ICON[preset.id];
        const current = preset.date === dueDate;
        return (
          <Pressable key={preset.id} haptic="none" data-popover-item data-current={current ? '' : undefined}
            onClick={() => onPick(preset.date)} className={itemClass} aria-pressed={current}>
            <Icon size={15} className={tone} aria-hidden="true" />
            <span className="flex-1">{preset.label}</span>
            {preset.date && <span className="text-xs font-normal text-text-secondary">{weekdayShort(preset.date)}.</span>}
            {current && <Check size={14} className="text-primary" aria-hidden="true" />}
          </Pressable>
        );
      })}
      <label className="mt-1 flex items-center gap-2 border-t border-border-custom/60 px-2.5 pb-1 pt-2 text-xs text-text-secondary">
        Inna data
        <ControlInput type="date" value={dueDate ?? ''} min="2000-01-01"
          onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
          className="ml-auto h-8 rounded-md border border-border-custom bg-surface-solid px-2 text-xs text-text-primary focus-visible:shadow-focus" />
      </label>
    </div>
  );
}

export function PriorityPanel({ priority, onPick }: { priority: string; onPick: (priority: string) => void }) {
  return (
    <div role="group" aria-label="Priorytet">
      {PRIORITY_OPTIONS.map((option) => {
        const current = option.id === priority;
        return (
          <Pressable key={option.id} haptic="none" data-popover-item data-current={current ? '' : undefined}
            onClick={() => onPick(option.id)} className={itemClass} aria-pressed={current}>
            <Flag size={15} className={option.tone} aria-hidden="true" />
            <span className="flex-1">{option.label}</span>
            {current && <Check size={14} className="text-primary" aria-hidden="true" />}
          </Pressable>
        );
      })}
    </div>
  );
}

interface MovePanelProps {
  sections: { id: string; name: string }[];
  sectionId: string | null;
  onPick: (sectionId: string | null) => void;
}

export function MovePanel({ sections, sectionId, onPick }: MovePanelProps) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLocaleLowerCase('pl');
  const options = [{ id: null as string | null, name: 'Skrzynka' }, ...sections]
    .filter((option) => !needle || option.name.toLocaleLowerCase('pl').includes(needle));
  return (
    <div>
      <div className="relative mb-1">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
        <ControlInput data-autofocus value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && options[0]) { e.preventDefault(); onPick(options[0].id); } }}
          placeholder="Przenieś do…" aria-label="Szukaj sekcji"
          className="h-9 w-full rounded-lg border border-border-custom bg-surface-solid pl-8 pr-2 text-sm text-text-primary focus-visible:shadow-focus" />
      </div>
      <div role="group" aria-label="Sekcje" className="max-h-60 overflow-y-auto overscroll-contain">
        {options.map((option) => {
          const current = option.id === sectionId;
          const Icon = option.id === null ? Inbox : FolderOpen;
          return (
            <Pressable key={option.id ?? 'inbox'} haptic="none" data-popover-item data-current={current ? '' : undefined}
              onClick={() => onPick(option.id)} className={itemClass} aria-pressed={current}>
              <Icon size={15} className="text-text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              {current && <Check size={14} className="text-primary" aria-hidden="true" />}
            </Pressable>
          );
        })}
        {options.length === 0 && <p className="px-2.5 py-2 text-xs text-text-secondary">Brak pasujących sekcji</p>}
      </div>
    </div>
  );
}
