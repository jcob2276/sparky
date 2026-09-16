/**
 * @component EventQuickActions
 * @role Hoverowe akcje szybkie na bloku wydarzenia (edytuj / usuń) — Notion Calendar style.
 *          Renderowany wewnątrz bloku wydarzenia; czyta akcje z CalendarContext,
 *          więc nie wymaga przekazywania propsów przez całe drzewo siatki.
 */
import { Edit3, Trash2 } from 'lucide-react';
import { useCalendar } from '../context/CalendarContext';
import type { CalRow } from '../calendarHelpers';
import { Pressable } from '../../ui/ControlPrimitives';

export function EventQuickActions({ ev }: { ev: CalRow }) {
  const { calData } = useCalendar();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    calData.openEditFromPreview(ev);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void calData.deleteEventWithUndo(ev);
  };

  return (
    <div
      className="absolute top-1 right-1 z-[var(--z-sticky)] flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Pressable
        type="button"
        onClick={handleEdit}
        aria-label={`Edytuj: ${ev.summary || 'Wydarzenie'}`}
        title="Edytuj"
        className="p-1 rounded-md bg-background/85 dark:bg-surface-solid/85 text-text-muted hover:text-text-primary hover:bg-background border border-border-custom/40 shadow-2xs active:scale-[0.96] transition-[transform,background-color,color] duration-150 ease-out cursor-pointer"
      >
        <Edit3 size={11} />
      </Pressable>
      <Pressable
        type="button"
        onClick={handleDelete}
        aria-label={`Usuń: ${ev.summary || 'Wydarzenie'}`}
        title="Usuń"
        className="p-1 rounded-md bg-background/85 dark:bg-surface-solid/85 text-text-muted hover:text-danger hover:bg-danger/10 border border-border-custom/40 shadow-2xs active:scale-[0.96] transition-[transform,background-color,color] duration-150 ease-out cursor-pointer"
      >
        <Trash2 size={11} />
      </Pressable>
    </div>
  );
}
