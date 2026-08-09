/**
 * @component TerminyPage
 * @role Terminy — urodziny, przeglądy, polisy z przypomnieniami.
 * @usedBy Dashboard (/terminy)
 */
import { useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getTodayWarsaw, nextOccurrence, type LifeObligationKind } from '@vanguard/domain';
import { useStore } from '../../store/useStore';
import { confirmDialog, notify } from '../../lib/notify';
import { formatLongDateWarsaw } from '../../lib/date';
import { createTodoItem } from '../../lib/todo/todo';
import {
  useLifeObligationMutations,
  useLifeObligations,
  type LifeObligation,
  type LifeObligationInput,
} from '../../lib/lifeObligationsApi';
import TerminyAddSheet from './TerminyAddSheet';
import TerminySidebar from './TerminySidebar';
import TerminyPageContent, {
  type FilterMode,
  type TerminyTabKey,
} from './TerminyPageContent';
import { deriveAll, type StarterTemplate, type DerivedObligation } from './terminyDerived';

export type { FilterMode, TerminyTabKey } from './TerminyPageContent';

interface Props {
  onBack: () => void;
  onNavigateTo?: (dest: string) => void;
}

function filterObligations(rows: DerivedObligation[], query: string, mode: FilterMode) {
  const normalizedQuery = query.toLowerCase().trim();
  return rows.filter((row) => {
    if (normalizedQuery) {
      const matches = row.item.title.toLowerCase().includes(normalizedQuery)
        || (row.item.related_name?.toLowerCase().includes(normalizedQuery) ?? false)
        || (row.item.notes?.toLowerCase().includes(normalizedQuery) ?? false);
      if (!matches) return false;
    }
    if (mode === 'urgent') return row.daysLeft <= 7;
    if (mode === 'notes') return Boolean(row.item.notes);
    return true;
  });
}

export default function TerminyPage({ onBack, onNavigateTo }: Props) {
  const userId = useStore((state) => state.session?.user?.id);
  const today = getTodayWarsaw();
  const { data: items = [], isLoading, error } = useLifeObligations(userId);
  const { add, remove, update } = useLifeObligationMutations(userId);
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<TerminyTabKey>('horizon');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [seedTemplate, setSeedTemplate] = useState<StarterTemplate | null>(null);
  const [editing, setEditing] = useState<LifeObligation | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const allRows = useMemo(() => deriveAll(items, today), [items, today]);
  const filteredRows = useMemo(
    () => filterObligations(allRows, searchQuery, filterMode),
    [allRows, searchQuery, filterMode],
  );
  const urgentCount = useMemo(() => allRows.filter((row) => row.daysLeft <= 7).length, [allRows]);
  const notesCount = useMemo(() => allRows.filter((row) => Boolean(row.item.notes)).length, [allRows]);

  const openAdd = (template?: StarterTemplate | null, kind?: LifeObligationKind) => {
    setEditing(null);
    setSeedTemplate(template ?? null);
    if (kind === 'people' || kind === 'vehicle' || kind === 'document') setTab(kind);
    setAddOpen(true);
  };

  const openEdit = (id: string) => {
    const item = items.find((row) => row.id === id);
    if (!item) return;
    setSeedTemplate(null);
    setEditing(item);
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setSeedTemplate(null);
    setEditing(null);
  };

  const submit = async (input: LifeObligationInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...input });
        notify('Zapisano zmiany', 'success');
      } else {
        await add.mutateAsync(input);
        notify('Dodano termin', 'success');
      }
      closeAdd();
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się zapisać', 'error');
    }
  };

  const onDelete = async (id: string, title: string) => {
    if (!(await confirmDialog(`Usunąć „${title}”?`))) return;
    try {
      await remove.mutateAsync(id);
      notify('Usunięto', 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się usunąć', 'error');
    }
  };

  const handleComplete = async (row: DerivedObligation) => {
    try {
      if (row.item.recurrence === 'once') {
        await remove.mutateAsync(row.item.id);
        notify(`Zrealizowano: „${row.item.title}”`, 'success');
      } else {
        const nextDate = nextOccurrence(row.item.anchor_date, row.item.recurrence, today) ?? today;
        await update.mutateAsync({ id: row.item.id, anchor_date: nextDate });
        notify(`Zrealizowano! Odnowiono termin „${row.item.title}” na ${formatLongDateWarsaw(nextDate)}`, 'success');
      }
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się zaktualizować', 'error');
    }
  };

  const handleConvertToTodo = async (row: DerivedObligation) => {
    if (!userId) return;
    try {
      await createTodoItem(userId, {
        title: `Termin: ${row.item.title}${row.item.related_name ? ` (${row.item.related_name})` : ''}`,
        due_date: row.nextDate,
        notes: row.item.notes ? `Wpis z Terminów: ${row.item.notes}` : `Termin: ${row.nextDate}`,
      });
      notify(`Utworzono zadanie w Todo: „${row.item.title}”`, 'success');
    } catch (caught: unknown) {
      notify(caught instanceof Error ? caught.message : 'Nie udało się utworzyć zadania', 'error');
    }
  };

  if (!userId) {
    return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-text-muted">Zaloguj się, żeby otworzyć Terminy.</div>;
  }

  const initialKind: LifeObligationKind = tab === 'horizon' ? 'people' : tab;
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-text-primary">
      <TerminySidebar tab={tab} setTab={setTab} rows={allRows} onNavigateTo={onNavigateTo} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TerminyPageContent
        onBack={onBack}
        onAdd={() => openAdd(null)}
        onOpenTemplate={(template) => openAdd(template ?? null)}
        onOpenKind={(kind) => openAdd(null, kind)}
        rows={allRows}
        filteredRows={filteredRows}
        isLoading={isLoading}
        error={error instanceof Error ? error : null}
        urgentCount={urgentCount}
        notesCount={notesCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        tab={tab}
        onTabChange={setTab}
        reduceMotion={reduceMotion}
        onDelete={onDelete}
        onEdit={openEdit}
        onComplete={handleComplete}
        onConvertToTodo={handleConvertToTodo}
      />
      <TerminyAddSheet open={addOpen} onClose={closeAdd} onSubmit={submit} pending={add.isPending || update.isPending} initialTemplate={seedTemplate} initialKind={initialKind} editing={editing} />
    </div>
  );
}
