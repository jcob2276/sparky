/**
 * @component CalendarContextMenu
 * @role Apple-style glassmorphic context menu opened on right-click of a calendar event.
 */

import React, { useEffect, useRef } from 'react';
import {
  Edit3,
  Trash2,
  Video,
  Calendar,
  ArrowRight,
  Tag,
  X,
  ExternalLink,
} from 'lucide-react';
import type { CalRow } from './calendarHelpers';
import { detectVideoCallUrl } from './calendarHelpers';
import { LIFE_SPHERES } from '../../lib/projects/lifeSpheres';

export interface CalendarContextMenuState {
  x: number;
  y: number;
  event: CalRow;
}

interface CalendarContextMenuProps {
  menu: CalendarContextMenuState | null;
  onClose: () => void;
  onEdit: (event: CalRow) => void;
  onDelete: (event: CalRow) => void;
  onChangeCategory: (event: CalRow, category: string) => void;
  onMoveToDate: (event: CalRow, dateStr: string) => void;
  today: string;
}

export function CalendarContextMenu({
  menu,
  onClose,
  onEdit,
  onDelete,
  onChangeCategory,
  onMoveToDate,
  today,
}: CalendarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const { x, y, event } = menu;
  const videoCall =
    detectVideoCallUrl(event.location) ||
    detectVideoCallUrl(event.description) ||
    detectVideoCallUrl(event.summary);

  // Position adjustment to avoid overflowing viewport bounds
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 320);

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-[var(--z-emergency)] w-56 rounded-2xl border border-border-custom/50 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-xs font-semibold text-text-primary"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Event Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-custom/30 mb-1">
        <span className="truncate font-bold text-text-primary max-w-[160px]">
          {event.summary || 'Bez tytułu'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary rounded-full"
        >
          <X size={12} />
        </button>
      </div>

      {/* Video Call Quick Join Button if available */}
      {videoCall && (
        <a
          href={videoCall.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-primary text-on-accent font-bold mb-1 hover:brightness-110 active:scale-98 transition-all"
        >
          <Video size={14} />
          <span className="flex-1 truncate">Dołącz do spotkania</span>
          <ExternalLink size={12} />
        </a>
      )}

      {/* Edit */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onEdit(event);
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-solid text-text-primary active:scale-98 transition-all cursor-pointer"
      >
        <Edit3 size={14} className="text-primary" />
        <span>Edytuj wydarzenie</span>
      </button>

      {/* Move Date */}
      <div className="my-1 border-t border-border-custom/20 pt-1">
        <p className="px-2.5 py-0.5 text-3xs font-black uppercase tracking-wider text-text-muted/60">
          Przełóż termin
        </p>
        <button
          type="button"
          onClick={() => {
            onClose();
            onMoveToDate(event, today);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-solid text-text-secondary hover:text-text-primary active:scale-98 transition-all cursor-pointer"
        >
          <Calendar size={13} className="text-primary" />
          <span>Na Dzisiaj</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const iso = tomorrow.toISOString().slice(0, 10);
            onMoveToDate(event, iso);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-surface-solid text-text-secondary hover:text-text-primary active:scale-98 transition-all cursor-pointer"
        >
          <ArrowRight size={13} className="text-warning" />
          <span>Na Jutro</span>
        </button>
      </div>

      {/* Change Category / Life Sphere */}
      <div className="my-1 border-t border-border-custom/20 pt-1">
        <p className="px-2.5 py-0.5 text-3xs font-black uppercase tracking-wider text-text-muted/60 flex items-center gap-1">
          <Tag size={10} />
          <span>Kategoria / Sfera</span>
        </p>
        <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
          {LIFE_SPHERES.map((sphere) => (
            <button
              key={sphere.id}
              type="button"
              onClick={() => {
                onClose();
                onChangeCategory(event, sphere.id);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-3xs font-bold transition-all border ${
                event.category?.toLowerCase() === sphere.id
                  ? 'border-primary bg-primary/10 text-primary font-black'
                  : 'border-border-custom/30 hover:bg-surface-solid text-text-secondary'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${sphere.dot}`} />
              <span className="truncate">{sphere.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delete */}
      <div className="mt-1 border-t border-border-custom/20 pt-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onDelete(event);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-danger/15 text-danger active:scale-98 transition-all cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Usuń wydarzenie</span>
        </button>
      </div>
    </div>
  );
}
