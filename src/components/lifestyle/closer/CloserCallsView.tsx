import { useState } from 'react';
import { ArrowUpRight, MessageSquare, Play, Search } from 'lucide-react';
import type { CloserCallRow, CloserCallSummary } from '../../../lib/closer/closerCallsApi';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { filterCloserCalls, type LibraryScope } from '../../../lib/closer/closerLibrary';
import { phaseReport } from '../../../lib/closer/closerPhaseTrends';
import CloserPhaseTrends from './CloserPhaseTrends';
import { formatLongDateWarsaw, warsawTimeOfDay } from '../../../lib/date';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Card } from '../../ui/Card';
import Spinner from '../../ui/Spinner';
import EmptyState from '../../ui/EmptyState';
import DataStateNotice from '../../core/DataStateNotice';
import CloserCallReviewView from './CloserCallReviewView';
import Modal from '../../ui/Modal';
interface Props {
  calls: CloserCallSummary[]; date: string; weekStart: string;
  detailLoading: boolean; detailError: boolean; loading: boolean; error: boolean;
  selected: CloserCallRow | undefined; onSelect: (id: string | null) => void;
  onSaveNotes: (notes: string) => void; saving: boolean; saveError: boolean;
  dayContext?: CloserDailyLogRow | null; contextLoading?: boolean; contextError?: boolean;
}
export default function CloserCallsView({ calls, date, weekStart, loading, error, selected, detailLoading, detailError, onSelect, onSaveNotes, saving, saveError, dayContext, contextLoading, contextError }: Props) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<LibraryScope>('all');
  const [limit, setLimit] = useState(8);
  const filtered = filterCloserCalls(calls, search, scope, date, weekStart);
  const visible = filtered.slice(0, limit);
  const filters: { value: LibraryScope; label: string }[] = [
    { value: 'all', label: 'Wszystkie' }, { value: 'week', label: 'Ten tydzień' },
    { value: 'day', label: `Wybrany dzień · ${formatLongDateWarsaw(date)}` }, { value: 'notes', label: 'Z moją notatką' },
  ];
  return <section id={"closer-library-" + weekStart} className="scroll-mt-6 space-y-5 border-t border-border-custom pt-6" aria-label="Nagrane rozmowy">
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight text-text-primary">Biblioteka rozmów</h3>
      <p className="text-sm text-text-secondary">Cała historia z Fathom{!loading && !error ? ` · ${calls.length} nagrań` : ''}</p>
    </div>
    {!loading && !error && <CloserPhaseTrends report={phaseReport(calls)} />}
    <Input aria-label="Szukaj rozmowy lub własnej notatki" placeholder="Szukaj rozmowy lub swojej notatki…" icon={<Search size={18} />}
      value={search} onChange={event => { setSearch(event.target.value); setLimit(8); }} />
    <div className="flex flex-wrap gap-2" aria-label="Zakres biblioteki">
      {filters.map(filter => <Button key={filter.value} variant={scope === filter.value ? 'primary' : 'outline'}
        aria-pressed={scope === filter.value} onClick={() => { setScope(filter.value); setLimit(8); }}>{filter.label}</Button>)}
    </div>
    {error ? <DataStateNotice tone="warning" title="Nie udało się wczytać rozmów" detail="Odśwież widok i spróbuj ponownie." />
      : loading ? <div className="flex items-center gap-3 py-5 text-sm text-text-secondary"><Spinner size="sm" /> Ładowanie rozmów…</div>
      : !calls.length ? <EmptyState compact icon={<MessageSquare size={20} />} label="Brak nagrań w bibliotece" description="Nowe rozmowy pojawią się tutaj po przetworzeniu przez Fathom." />
      : !filtered.length ? <EmptyState compact icon={<Search size={20} />} label="Brak rozmów dla tych filtrów" description="Zmień wyszukiwanie lub wybierz wszystkie nagrania." />
      : <>
        <p role="status" className="text-xs text-text-secondary">Pokazano {visible.length} z {filtered.length} pasujących · cała biblioteka: {calls.length}</p>
        <Card variant="grouped" padding="0" className="divide-y divide-border-custom">
          {visible.map(call => <Button key={call.id} variant="ghost" onClick={() => onSelect(call.id)}
            className="!h-auto min-h-24 w-full !justify-start gap-4 !rounded-none !px-4 !py-5 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Play size={18} /></span>
            <span className="min-w-0 flex-1 space-y-2">
              <span className="block whitespace-normal break-words text-sm font-semibold leading-6 text-text-primary">{call.title}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-text-secondary">
                <span>{formatLongDateWarsaw(call.started_at)} · {warsawTimeOfDay(call.started_at)}{call.duration_seconds !== null ? ' · ' + Math.round(call.duration_seconds / 60) + ' min' : ''}</span>
                <span>{call.ai_status === 'done' ? 'Analiza gotowa' : call.ai_status === 'skipped' ? 'Brak transkrypcji' : call.ai_status === 'failed' ? 'Analiza niedostępna' : 'Analiza w toku'}</span>
                {call.review_notes.trim() && <span>Masz notatkę</span>}
              </span>
              {call.review_notes.trim() && <span className="line-clamp-2 block whitespace-normal break-words text-sm font-normal leading-6 text-text-secondary">{call.review_notes}</span>}
              <span className="block text-sm font-medium text-primary">Otwórz analizę</span>
            </span>
            <ArrowUpRight size={18} className="shrink-0 text-primary" />
          </Button>)}
        </Card>
        {visible.length < filtered.length && <Button className="w-full" variant="outline" onClick={() => setLimit(limit + 8)}>Pokaż kolejne rozmowy · pozostało {filtered.length - visible.length}</Button>}
      </>}
    {(detailLoading || detailError) && <Modal isOpen onClose={() => onSelect(null)} title="Analiza rozmowy">
      {detailError ? <DataStateNotice title="Nie udało się otworzyć rozmowy" detail="Zamknij ten widok i spróbuj ponownie." tone="warning" />
        : <div className="flex items-center gap-3 py-8"><Spinner size="sm" /> Wczytywanie rozmowy…</div>}
    </Modal>}
    {selected && !detailLoading && !detailError && <CloserCallReviewView key={selected.id} call={selected} onClose={() => onSelect(null)}
      onSaveNotes={onSaveNotes} saving={saving} saveError={saveError} dayContext={dayContext} contextLoading={contextLoading} contextError={contextError} />}
  </section>;
}
