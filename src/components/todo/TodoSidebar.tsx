import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { useRef, useState } from 'react';
import { Plus, Inbox, CalendarDays, CalendarClock, Pencil, Trash2 } from 'lucide-react';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import type { WorkspaceDestination } from '../shared/WorkspaceNavigation';
import WorkspaceSidebar from '../shared/WorkspaceSidebar';
import SidebarSection from '../shared/SidebarSection';
import { useSidebar } from '../ui/sidebar';

export type TodoNavDest = 'overview' | 'inbox' | 'today' | 'upcoming' | 'all' | 'flagged' | 'completed';

export interface TodoSidebarProps {
  navDest: TodoNavDest;
  onNavDest: (dest: TodoNavDest) => void;
  inboxCount: number;
  todayCount: number;
  upcomingCount: number;
  sections: { id: string; name: string }[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onQuickAdd: () => void;
  onNavigateTo?: (dest: WorkspaceDestination) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function TodoSidebar({
  collapsed,
  onToggleCollapse,
  navDest,
  onNavDest,
  inboxCount,
  todayCount,
  upcomingCount,
  sections,
  activeSectionId,
  onSelectSection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onQuickAdd: _onQuickAdd,
  onNavigateTo,
}: TodoSidebarProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const { setOpenMobile } = useSidebar();
  // Escape unmounts the input, which can still fire blur → must not commit a cancelled edit.
  const cancelledRef = useRef(false);

  const selectDestination = (destination: TodoNavDest) => {
    onNavDest(destination);
    setOpenMobile(false);
  };

  const selectSection = (id: string) => {
    onSelectSection(id);
    setOpenMobile(false);
  };

  const commitAdd = () => {
    if (cancelledRef.current) { cancelledRef.current = false; return; }
    const n = newName.trim();
    if (n) onAddSection(n);
    setNewName('');
    setAdding(false);
  };

  const commitRename = (id: string) => {
    if (cancelledRef.current) { cancelledRef.current = false; return; }
    const n = renameVal.trim();
    if (n) onRenameSection(id, n);
    setRenamingId(null);
  };

  return (
    <WorkspaceSidebar collapsed={collapsed} onCollapse={onToggleCollapse} className="todo-sidebar gap-3" provideContext={false} mobileTitle="Zadania">
      {/* Workspace Section */}
      <div className="flex flex-col gap-0.5">
        <WorkspaceNavigation
          active="todo"
          onNavigate={(destination) => {
            if (destination === 'todo') selectDestination('overview');
            else setOpenMobile(false);
            onNavigateTo?.(destination);
          }}
        />
      </div>


      <SidebarSection
        bordered
        items={[
          {
            id: 'inbox',
            label: 'Skrzynka',
            icon: <Inbox size={14} />,
            count: inboxCount,
            active: navDest === 'inbox',
            onClick: () => selectDestination('inbox'),
          },
          {
            id: 'today',
            label: 'Dziś',
            icon: <CalendarDays size={14} />,
            count: todayCount,
            active: navDest === 'today',
            onClick: () => selectDestination('today'),
          },
          {
            id: 'upcoming',
            label: 'Nadchodzące',
            icon: <CalendarClock size={14} />,
            count: upcomingCount,
            active: navDest === 'upcoming',
            onClick: () => selectDestination('upcoming'),
          },
        ]}
      />

      <SidebarSection
        key={adding ? 'projects-adding' : 'projects'}
        label="Moje projekty"
        collapsible
        defaultOpen
        onAdd={() => { cancelledRef.current = false; setAdding(true); }}
        addTitle="Dodaj listę"
        bordered
        className="flex-1 min-h-0"
        items={sections.map((s) => ({
          id: s.id,
          label: s.name,
          active: navDest === 'overview' && activeSectionId === s.id,
          onClick: () => selectSection(s.id),
          editing: renamingId === s.id ? (
            <ControlInput
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={() => commitRename(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(s.id);
                if (e.key === 'Escape') { cancelledRef.current = true; setRenamingId(null); }
              }}
              className="flex-1 rounded-lg border border-primary/40 bg-surface-solid px-2 py-1 text-sm font-semibold text-primary outline-none"
            />
          ) : undefined,
          actions: renamingId === s.id ? undefined : (
            <>
              <Pressable
                onClick={() => {
                  cancelledRef.current = false;
                  setRenamingId(s.id);
                  setRenameVal(s.name);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg md:h-7 md:w-7 text-text-muted/60 hover:text-primary transition-colors"
                title="Zmień nazwę"
              >
                <Pencil size={12} />
              </Pressable>
              <Pressable
                onClick={() => onDeleteSection(s.id)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg md:h-7 md:w-7 text-text-muted/60 hover:text-danger transition-colors"
                title="Usuń listę"
              >
                <Trash2 size={12} />
              </Pressable>
            </>
          ),
        }))}
        trailingAdd={
          adding ? (
            <ControlInput
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') { cancelledRef.current = true; setAdding(false); setNewName(''); }
              }}
              placeholder="Nazwa listy…"
              className="mt-0.5 rounded-lg border border-primary/40 bg-surface-solid px-2 py-1 text-sm font-semibold text-primary outline-none"
            />
          ) : (
            <Pressable
              onClick={() => { cancelledRef.current = false; setAdding(true); }}
              className="mt-0.5 flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm md:min-h-0 font-medium text-text-muted/60 hover:text-text-primary transition-colors"
            >
              <Plus size={12} /> Nowa lista
            </Pressable>
          )
        }
      />
    </WorkspaceSidebar>
  );
}
