import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Calendar, FileSpreadsheet, Filter, Plus, Search } from 'lucide-react';
import type { DerivedObligation, StarterTemplate } from './terminyDerived';
import ContentContainer from '../shared/ContentContainer';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import { Pressable } from '../ui/ControlPrimitives';
import { TerminyHorizon } from './TerminyHorizon';
import { TerminyVault } from './TerminyVault';

export type TerminyTabKey = 'horizon' | 'people' | 'vehicle' | 'document';
export type FilterMode = 'all' | 'urgent' | 'notes';

const TABS = [
  { key: 'horizon', label: 'Nadchodzące' },
  { key: 'people', label: 'Ludzie' },
  { key: 'vehicle', label: 'Pojazd' },
  { key: 'document', label: 'Dokumenty' },
] as const;

interface RowActions {
  onDelete: (id: string, title: string) => Promise<void>;
  onEdit: (id: string) => void;
  onComplete: (row: DerivedObligation) => Promise<void>;
  onConvertToTodo: (row: DerivedObligation) => Promise<void>;
}

interface Props extends RowActions {
  onBack: () => void;
  onAdd: () => void;
  onOpenTemplate: (template?: StarterTemplate | null) => void;
  onOpenKind: (kind: Exclude<TerminyTabKey, 'horizon'>) => void;
  rows: DerivedObligation[];
  filteredRows: DerivedObligation[];
  isLoading: boolean;
  error: Error | null;
  urgentCount: number;
  notesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterMode: FilterMode;
  onFilterChange: (value: FilterMode) => void;
  tab: TerminyTabKey;
  onTabChange: (value: TerminyTabKey) => void;
  reduceMotion: boolean | null;
}

function TerminyHeader({ onBack, onAdd }: Pick<Props, 'onBack' | 'onAdd'>) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-white/10 bg-background/70 backdrop-blur-xl transition-colors duration-200 dark:border-white/5">
      <div className="mx-auto flex max-w-[var(--content-wide)] items-center gap-3 px-4 py-3.5 md:px-8">
        <Pressable onClick={onBack} aria-label="Wróć" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2/60 text-text-secondary transition-all duration-150 hover:bg-surface-3 hover:text-text-primary active:scale-90">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </Pressable>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Terminy</h1>
          <p className="text-xs text-text-muted">Urodziny, przeglądy, polisy i przypomnienia</p>
        </div>
        <Pressable onClick={onAdd} aria-label="Dodaj termin" className="flex h-9.5 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-on-accent shadow-xs transition-all duration-150 hover:opacity-90 active:scale-95">
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Dodaj</span>
        </Pressable>
      </div>
    </header>
  );
}

function TerminyScorecards({ total, urgent, notes }: { total: number; urgent: number; notes: number }) {
  const cards = [
    { label: 'Wszystkie', value: total, Icon: Calendar, color: 'text-primary' },
    { label: 'Pilne (≤7 dni)', value: urgent, Icon: AlertTriangle, color: 'text-warning' },
    { label: 'Z notatkami', value: notes, Icon: FileSpreadsheet, color: 'text-info' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ label, value, Icon, color }) => (
        <div key={label} className="flex flex-col justify-between rounded-[20px] border border-border-custom/30 bg-surface-solid/70 p-3.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            <Icon size={14} className={color} />
            <span>{label}</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TerminyToolbar({ searchQuery, onSearchChange, filterMode, onFilterChange }: Pick<Props, 'searchQuery' | 'onSearchChange' | 'filterMode' | 'onFilterChange'>) {
  const filters: Array<{ key: FilterMode; label: string; active: string }> = [
    { key: 'all', label: 'Wszystkie', active: 'bg-primary' },
    { key: 'urgent', label: 'Pilne', active: 'bg-warning' },
    { key: 'notes', label: 'Z notatkami', active: 'bg-info' },
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <Input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Szukaj terminu, osoby lub notatki..." className="rounded-[14px] border-border-custom/30 bg-surface-2/60 pl-9.5 text-xs focus:bg-surface-solid" />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Filter size={13} className="mr-1 text-text-muted" />
        {filters.map((filter) => (
          <Pressable key={filter.key} onClick={() => onFilterChange(filter.key)} className={`rounded-full px-3 py-1 text-2xs font-semibold transition-all ${filterMode === filter.key ? `${filter.active} text-on-accent` : 'bg-surface-2 text-text-secondary'}`}>
            {filter.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

function TerminyTabs({ tab, onTabChange }: Pick<Props, 'tab' | 'onTabChange'>) {
  return (
    <div className="relative flex rounded-[16px] bg-surface-2/70 p-1 ring-1 ring-border-custom/20 backdrop-blur-md">
      {TABS.map((item) => {
        const isActive = tab === item.key;
        return (
          <Pressable key={item.key} onClick={() => onTabChange(item.key)} className={`relative z-10 flex-1 rounded-[12px] py-2 text-xs font-semibold tracking-tight transition-colors duration-150 ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>
            {isActive && <motion.div layoutId="apple-terminy-tab-pill" className="absolute inset-0 rounded-[12px] bg-surface-solid shadow-xs ring-1 ring-black/5 dark:ring-white/10" transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }} />}
            <span className="relative z-10">{item.label}</span>
          </Pressable>
        );
      })}
    </div>
  );
}

function TerminyResults(props: Pick<Props, 'tab' | 'filterMode' | 'searchQuery' | 'filteredRows' | 'reduceMotion' | 'onDelete' | 'onEdit' | 'onComplete' | 'onConvertToTodo' | 'onOpenTemplate' | 'onOpenKind'>) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={`${props.tab}:${props.filterMode}:${props.searchQuery}`} initial={props.reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={props.reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}>
        {props.tab === 'horizon' ? (
          <TerminyHorizon rows={props.filteredRows} onDelete={props.onDelete} onEdit={props.onEdit} onComplete={props.onComplete} onConvertToTodo={props.onConvertToTodo} onOpenAdd={props.onOpenTemplate} />
        ) : (
          <TerminyVault kind={props.tab} rows={props.filteredRows} onDelete={props.onDelete} onEdit={props.onEdit} onComplete={props.onComplete} onConvertToTodo={props.onConvertToTodo} onOpenAdd={() => props.onOpenKind(props.tab as Exclude<TerminyTabKey, 'horizon'>)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default function TerminyPageContent(props: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col h-full overflow-y-auto">
      <TerminyHeader onBack={props.onBack} onAdd={props.onAdd} />
      <ContentContainer width="default" className="flex-1 space-y-6 pb-16 pt-6">
        {props.isLoading && <div className="flex justify-center py-16"><Spinner /></div>}
        {props.error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20">{props.error.message}</p>}
        {!props.isLoading && !props.error && (
          <>
            <TerminyScorecards total={props.rows.length} urgent={props.urgentCount} notes={props.notesCount} />
            <TerminyToolbar {...props} />
            <TerminyTabs {...props} />
            <TerminyResults {...props} />
          </>
        )}
      </ContentContainer>
    </div>
  );
}
