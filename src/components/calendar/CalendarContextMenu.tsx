/**
 * @component CalendarContextMenu
 * @role Apple-style glassmorphic context menu opened on right-click of a calendar event.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Edit3,
  Trash2,
  Video,
  Calendar,
  ArrowRight,
  Tag,
  X,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { CalRow } from './calendarHelpers';
import { addDays, detectVideoCallUrl } from './calendarHelpers';
import { LIFE_SPHERES } from '../../lib/projects/lifeSpheres';
import { Pressable } from '../ui/ControlPrimitives';

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
  onDuplicate: (event: CalRow) => void;
  onChangeCategory: (event: CalRow, category: string) => void;
  onMoveToDate: (event: CalRow, dateStr: string) => void;
  today: string;
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Pressable
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl active:scale-[0.97] transition-[transform,background-color,color] duration-150 ease-out cursor-pointer ${
        danger
          ? 'hover:bg-danger/15 text-danger'
          : 'hover:bg-surface-solid text-text-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Pressable>
  );
}

function CategoryGrid({
  event,
  onSelect,
}: {
  event: CalRow;
  onSelect: (category: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
      {LIFE_SPHERES.map((sphere) => (
        <Pressable
          key={sphere.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(sphere.id)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-2xs font-bold active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out border ${
            event.category?.toLowerCase() === sphere.id
              ? 'border-primary bg-primary/10 text-primary font-black'
              : 'border-border-custom/30 hover:bg-surface-solid text-text-secondary'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${sphere.dot}`} />
          <span className="truncate">{sphere.label.split(' ')[0]}</span>
        </Pressable>
      ))}
    </div>
  );
}

function MoveSection({
  event,
  today,
  onMoveToDate,
}: {
  event: CalRow;
  today: string;
  onMoveToDate: (event: CalRow, dateStr: string) => void;
}) {
  return (
    <div className="my-1 border-t border-border-custom/20 pt-1">
      <p className="px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-text-muted/70">
        Przełóż termin
      </p>
      <MenuItem
        icon={<Calendar size={13} className="text-primary" />}
        label="Na Dzisiaj"
        onClick={() => onMoveToDate(event, today)}
      />
      <MenuItem
        icon={<ArrowRight size={13} className="text-warning" />}
        label="Na Jutro"
        onClick={() => onMoveToDate(event, addDays(today, 1))}
      />
    </div>
  );
}

export function CalendarContextMenu({
  menu,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeCategory,
  onMoveToDate,
  today,
}: CalendarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // Pozycja korygowana po pomiarze menu — bez odczytu refa podczas renderu.
  const [adjusted, setAdjusted] = useState<{ x: number; y: number } | null>(null);

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

  useLayoutEffect(() => {
    if (!menu) return;
    // Auto-focus first focusable item for keyboard users
    const firstItem = menuRef.current?.querySelector<HTMLElement>('button, a[href]');
    firstItem?.focus();

    const el = menuRef.current;
    if (!el) return;
    const menuH = el.offsetHeight;
    setAdjusted({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - el.offsetWidth - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - menuH - 8)),
    });
    return () => setAdjusted(null);
  }, [menu]);

  if (!menu) return null;

  const { event } = menu;
  const videoCall =
    detectVideoCallUrl(event.location) ||
    detectVideoCallUrl(event.description) ||
    detectVideoCallUrl(event.summary);

  const pos = adjusted ?? { x: menu.x, y: menu.y };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Akcje dla: ${event.summary || 'Wydarzenie'}`}
      style={{ top: pos.y, left: pos.x }}
      className="fixed z-[var(--z-emergency)] w-56 rounded-2xl border border-border-custom/50 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-xs font-semibold text-text-primary"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Event Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-custom/30 mb-1">
        <span className="truncate font-bold text-text-primary max-w-[160px]">
          {event.summary || 'Bez tytułu'}
        </span>
        <Pressable
          type="button"
          role="menuitem"
          onClick={onClose}
          aria-label="Zamknij menu kontekstowe"
          className="p-1 text-text-muted hover:text-text-primary rounded-full focus-visible:ring-1 focus-visible:ring-primary outline-none"
        >
          <X size={12} />
        </Pressable>
      </div>

      {/* Video Call Quick Join Button if available */}
      {videoCall && (
        <a
          href={videoCall.url}
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          onClick={onClose}
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-primary text-on-accent font-bold mb-1 hover:brightness-110 active:scale-[0.98] ui-interactive"
        >
          <Video size={14} />
          <span className="flex-1 truncate">Dołącz do spotkania</span>
          <ExternalLink size={12} />
        </a>
      )}

      {/* Edit / Duplicate */}
      <MenuItem
        icon={<Edit3 size={14} className="text-primary" />}
        label="Edytuj wydarzenie"
        onClick={() => {
          onClose();
          onEdit(event);
        }}
      />
      <MenuItem
        icon={<Copy size={14} className="text-info" />}
        label="Duplikuj wydarzenie"
        onClick={() => {
          onClose();
          onDuplicate(event);
        }}
      />

      <MoveSection event={event} today={today} onMoveToDate={(ev, date) => {
        onClose();
        onMoveToDate(ev, date);
      }} />

      {/* Change Category / Life Sphere */}
      <div className="my-1 border-t border-border-custom/20 pt-1">
        <p className="px-2.5 py-0.5 text-2xs font-black uppercase tracking-wider text-text-muted/70 flex items-center gap-1">
          <Tag size={10} />
          <span>Kategoria / Sfera</span>
        </p>
        <CategoryGrid
          event={event}
          onSelect={(category) => {
            onClose();
            onChangeCategory(event, category);
          }}
        />
      </div>

      {/* Delete */}
      <div className="mt-1 border-t border-border-custom/20 pt-1">
        <MenuItem
          icon={<Trash2 size={14} />}
          label="Usuń wydarzenie"
          danger
          onClick={() => {
            onClose();
            onDelete(event);
          }}
        />
      </div>
    </div>
  );
}
