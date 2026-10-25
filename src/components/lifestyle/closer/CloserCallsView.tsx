import { ArrowUpRight, MessageSquare, Play } from 'lucide-react';
import type { CloserCallRow, CloserCallSummary } from '../../../lib/closer/closerCallsApi';
import { formatLongDateWarsaw, warsawTimeOfDay } from '../../../lib/date';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';
import Spinner from '../../ui/Spinner';
import EmptyState from '../../ui/EmptyState';
import DataStateNotice from '../../core/DataStateNotice';
import CloserCallReviewView from './CloserCallReviewView';
import Modal from '../../ui/Modal';

interface Props {
  calls: CloserCallSummary[];
  detailLoading: boolean;
  detailError: boolean;
  loading: boolean;
  error: boolean;
  selected: CloserCallRow | undefined;
  onSelect: (id: string | null) => void;
  onSaveNotes: (notes: string) => void;
  saving: boolean;
  saveError: boolean;
}

export default function CloserCallsView({ calls, loading, error, selected, detailLoading, detailError, onSelect, onSaveNotes, saving, saveError }: Props) {
  return (
    <section className="space-y-4 border-t border-border-custom pt-5" aria-label="Nagrane rozmowy">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-text-primary">Biblioteka rozmów</h3>
        <span className="text-xs text-text-secondary">Wszystkie nagrania · {calls.length}</span>
      </div>
      {error ? <DataStateNotice tone="warning" title="Nie udało się wczytać rozmów" detail="Odśwież widok i spróbuj ponownie." />
        : loading ? <div className="flex items-center gap-3 py-5 text-sm text-text-secondary"><Spinner size="sm" /> Ładowanie rozmów…</div>
        : !calls.length ? <EmptyState compact icon={<MessageSquare size={20} />} label="Brak nagrań w bibliotece" description="Nowe rozmowy pojawią się tutaj po przetworzeniu przez Fathom." />
        : <Card variant="grouped" padding="0" className="divide-y divide-border-custom">
          {calls.map(call => (
            <Button key={call.id} variant="ghost" onClick={() => onSelect(call.id)}
              className="!h-auto min-h-24 w-full !justify-start gap-4 !rounded-none !px-4 !py-5 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Play size={18} /></span>
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block whitespace-normal break-words text-sm font-semibold leading-6 text-text-primary">{call.title}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-text-secondary">
                  <span>{formatLongDateWarsaw(call.started_at)} · {warsawTimeOfDay(call.started_at)}{call.duration_seconds !== null ? ' · ' + Math.round(call.duration_seconds / 60) + ' min' : ''}</span>
                  <span>{call.ai_status === 'done' ? 'Analiza gotowa' : call.ai_status === 'skipped' ? 'Brak transkrypcji' : call.ai_status === 'failed' ? 'Analiza niedostępna' : 'Analiza w toku'}</span>
                  {call.review_notes && <span>Masz notatkę</span>}
                </span>
                <span className="block text-sm font-medium text-primary">Otwórz analizę</span>
              </span>
              <ArrowUpRight size={18} className="shrink-0 text-primary" />
            </Button>
          ))}
        </Card>}
      {(detailLoading || detailError) && <Modal isOpen onClose={() => onSelect(null)} title="Analiza rozmowy">
        {detailError ? <DataStateNotice title="Nie udało się otworzyć rozmowy" detail="Zamknij ten widok i spróbuj ponownie." tone="warning" />
          : <div className="flex items-center gap-3 py-8"><Spinner size="sm" /> Wczytywanie rozmowy…</div>}
      </Modal>}
      {selected && !detailLoading && !detailError && <CloserCallReviewView key={selected.id} call={selected} onClose={() => onSelect(null)}
        onSaveNotes={onSaveNotes} saving={saving} saveError={saveError} />}
    </section>
  );
}

