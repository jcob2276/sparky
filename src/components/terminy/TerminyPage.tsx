/**
 * @component TerminyPage
 * @role Terminy — urodziny, przeglądy, polisy z przypomnieniami.
 * @usedBy Dashboard (/terminy)
 */
import { useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getTodayWarsaw, type LifeObligationKind } from '@vanguard/domain';
import { useStore } from '../../store/useStore';
import {
  useLifeObligationMutations,
  useLifeObligations,
  type LifeObligation,
} from '../../lib/lifeObligationsApi';
import TerminyAddSheet from './TerminyAddSheet';
import TerminySidebar from './TerminySidebar';
import TerminyPageContent, {
  type FilterMode,
  type TerminyTabKey,
} from './TerminyPageContent';
import {
  deriveAll,
  type StarterTemplate,
  type DerivedObligation,
} from './terminyDerived';
import { useTerminyActions } from './useTerminyActions';

export type { FilterMode, TerminyTabKey } from './TerminyPageContent';

interface Props {
  onBack: () => void;
  onNavigateTo?: (dest: string) => void;
}

function filterObligations(
  rows: DerivedObligation[],
  query: string,
  mode: FilterMode,
  selectedMonth: number | null,
) {
  const normalizedQuery = query.toLowerCase().trim();
  return rows.filter((row) => {
    if (selectedMonth !== null) {
      const m = parseInt(row.nextDate.split('-')[1], 10);
      if (m !== selectedMonth) return false;
    }
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
  const mutations = useLifeObligationMutations(userId);
  const { add, update } = mutations;
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<TerminyTabKey>('horizon');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [seedTemplate, setSeedTemplate] = useState<StarterTemplate | null>(null);
  const [editing, setEditing] = useState<LifeObligation | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const allRows = useMemo(() => deriveAll(items, today), [items, today]);
  const filteredRows = useMemo(
    () => filterObligations(allRows, searchQuery, filterMode, selectedMonth),
    [allRows, searchQuery, filterMode, selectedMonth],
  );
  const urgentCount = useMemo(() => allRows.filter((row) => row.daysLeft <= 7).length, [allRows]);
  const notesCount = useMemo(() => allRows.filter((row) => Boolean(row.item.notes)).length, [allRows]);

  const changeTab = (next: TerminyTabKey) => {
    setTab(next);
    setSearchQuery('');
    setFilterMode('all');
    setSelectedMonth(null);
  };

  const openAdd = (template?: StarterTemplate | null, kind?: LifeObligationKind) => {
    setEditing(null);
    setSeedTemplate(template ?? null);
    if (kind) setTab(kind);
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

  const {
    submit,
    onDelete,
    handleComplete,
    handleConvertToTodo,
    handleAddToCalendar,
    handleExportICS,
    handleExportAllICS,
  } = useTerminyActions({
    userId,
    today,
    allRows,
    editing,
    mutations,
    onSuccessSave: closeAdd,
  });

  if (!userId) {
    return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-text-muted">Zaloguj się, żeby otworzyć Terminy.</div>;
  }

  const initialKind: LifeObligationKind = tab === 'horizon' ? 'people' : tab;
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-text-primary">
      <TerminySidebar tab={tab} setTab={changeTab} rows={allRows} onNavigateTo={onNavigateTo} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TerminyPageContent
        onBack={onBack}
        onAdd={() => openAdd(null)}
        onExportAllICS={handleExportAllICS}
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
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        tab={tab}
        onTabChange={changeTab}
        reduceMotion={reduceMotion}
        onDelete={onDelete}
        onEdit={openEdit}
        onComplete={handleComplete}
        onConvertToTodo={handleConvertToTodo}
        onAddToCalendar={handleAddToCalendar}
        onExportICS={handleExportICS}
      />
      <TerminyAddSheet open={addOpen} onClose={closeAdd} onSubmit={submit} pending={add.isPending || update.isPending} initialTemplate={seedTemplate} initialKind={initialKind} editing={editing} />
    </div>
  );
}
