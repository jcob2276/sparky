import { useState } from 'react';
import { ArrowUpRight, Check, Play, RefreshCw, Save } from 'lucide-react';
import type { CloserCallRow } from '../../../lib/closer/closerCallsApi';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import CloserWorkContextSummary from './CloserWorkContextSummary';
import { reviewMoments } from '../../../lib/closer/closerCallReview';
import { hasWorkContext } from '../../../lib/closer/closerWorkContext';
import { formatLongDateWarsaw, warsawTimeOfDay } from '../../../lib/date';
import { confirmDialog } from '../../../lib/notify';
import Button from '../../ui/Button';
import { ControlTextarea } from '../../ui/ControlPrimitives';
import Modal from '../../ui/Modal';
import EmptyState from '../../ui/EmptyState';
import CloserCallEvidence from './CloserCallEvidence';
import { useCloserReviewNotes } from './useCloserReviewNotes';
import { useCloserReanalyze } from './useCloserReanalyze';

interface Props {
  call: CloserCallRow;
  dayContext?: CloserDailyLogRow | null; contextLoading?: boolean; contextError?: boolean;
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
  saving: boolean;
  saveError: boolean;
}

export default function CloserCallReviewView({ call, onClose, onSaveNotes, saving, saveError, dayContext, contextLoading, contextError }: Props) {
  const moments = reviewMoments(call);
  const [selectedId, setSelectedId] = useState((moments.find(m => m.kind === 'practice') ?? moments[0])?.id);
  const { draft, setDraft, dirty, discard } = useCloserReviewNotes(call.user_id, call.id, call.review_notes);
  const reanalyze = useCloserReanalyze(call.id);
  const selected = moments.find(m => m.id === selectedId) ?? moments[0];
  const close = () => {
    if (saving) return;
    if (!dirty) { onClose(); return; }
    void confirmDialog('Masz niezapisaną notatkę. Zamknąć analizę bez zapisywania?').then(confirmed => {
      if (confirmed) { discard(); onClose(); }
    });
  };

  return (
    <Modal isOpen onClose={close} title="Analiza rozmowy" size="full" closeOnBackdropClick={false}
      padding="p-5 sm:p-8" className="!m-0 !max-w-[var(--closer-review-width)] !max-h-[var(--closer-review-height)]" overlayClassName="!p-2 sm:!p-5">
      <header className="mb-7 border-b border-border-custom pb-6">
        <p className="mb-2 text-sm text-text-secondary">
          {formatLongDateWarsaw(call.started_at)} · {warsawTimeOfDay(call.started_at)}
          {call.duration_seconds !== null ? ' · ' + Math.round(call.duration_seconds / 60) + ' min' : ''}
        </p>
        <h2 className="max-w-4xl break-words text-xl font-semibold leading-snug tracking-tight text-text-primary sm:text-2xl">{call.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Wybierz moment, sprawdź kontekst w nagraniu i zapisz, co chcesz zmienić.
        </p>
        {call.transcript && <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} loading={reanalyze.isPending}
            onClick={() => reanalyze.mutate()}>Przeanalizuj ponownie</Button>
          {reanalyze.isError && <span role="alert" className="text-xs text-danger">Nie udało się przeliczyć analizy. Spróbuj ponownie.</span>}
          {reanalyze.isSuccess && <span role="status" className="text-xs text-text-secondary">Analiza przeliczona.</span>}
        </div>}
        {hasWorkContext(dayContext) && (
          <p className="mt-2 text-sm text-text-secondary">
            Ty tego dnia: <span className="font-medium text-text-primary">
              {[dayContext?.work_energy ? `energia ${dayContext.work_energy}/5` : null, dayContext?.work_pressure ? `presja ${dayContext.work_pressure}/5` : null, dayContext?.notes?.trim() ? 'notatka dnia' : null].filter(Boolean).join(' · ')}
            </span>
          </p>
        )}
      </header>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[var(--closer-review-columns)] lg:gap-10">
        <div className="min-w-0"><CloserCallEvidence call={call} seconds={selected?.seconds ?? null} /><CloserWorkContextSummary row={dayContext} loading={contextLoading} error={contextError} /></div>
        <div className="min-w-0 space-y-7">
          <section aria-label="Momenty rozmowy" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-text-primary">Momenty do przejrzenia</h3>
              <span className="text-sm text-text-secondary">{moments.length}</span>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">Obserwacje AI do sprawdzenia w kontekście rozmowy.</p>
            {moments.length ? (
              <div className="max-h-72 overflow-y-auto rounded-[var(--radius-grouped)] border border-border-custom">
                {moments.map(moment => (
                  <Button key={moment.id} variant="ghost" onClick={() => setSelectedId(moment.id)}
                    aria-pressed={selected?.id === moment.id}
                    className={`!h-auto min-h-16 w-full !items-start !justify-start gap-3 !rounded-none border-b border-border-custom !px-4 !py-3 text-left last:border-b-0 ${selected?.id === moment.id ? '!bg-primary/10' : ''}`}>
                    <span className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-primary">{moment.timestamp || 'Bez czasu'}</span>
                    <span className="min-w-0 space-y-1">
                      <span className={`block text-xs font-medium ${moment.kind === 'practice' ? 'text-warning' : 'text-success'}`}>
                        {moment.kind === 'practice' ? 'Do przećwiczenia' : 'Warto powtarzać'}
                      </span>
                      <span className="line-clamp-2 block whitespace-normal text-sm font-medium leading-6 text-text-primary">{moment.what}</span>
                    </span>
                    {selected?.id === moment.id && <Play size={14} className="mt-1 shrink-0 text-primary" />}
                  </Button>
                ))}
              </div>
            ) : <EmptyState compact label="Brak momentów do przejrzenia"
              description={call.ai_status === 'pending' ? 'Analiza rozmowy jeszcze się przygotowuje.' : 'Możesz odsłuchać rozmowę i zapisać własne wnioski.'} />}
          </section>

          {selected && (
            <section aria-label="Wskazówka do wybranego momentu" className="space-y-4 border-l-2 border-primary pl-5">
              <div>
                <p className="mb-2 text-xs font-semibold text-primary">OBSERWACJA AI · {selected.timestamp || 'BEZ CZASU'}</p>
                {selected.quote && <blockquote className="mb-3 border-l-2 border-border-custom pl-3 text-sm italic leading-6 text-text-secondary">„{selected.quote}”</blockquote>}
                <p className="text-base leading-7 text-text-primary">{selected.what}</p>
              </div>
              {selected.why && <div>
                <h4 className="mb-2 text-sm font-semibold text-text-primary">{selected.experiment ? 'Możliwe wyjaśnienie' : selected.kind === 'practice' ? 'Pomysł do wypróbowania' : 'Co warto zachować'}</h4>
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">{selected.why}</p>
              </div>}
              {selected.experiment && <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  {selected.kind === 'practice' ? <ArrowUpRight size={16} /> : <Check size={16} />}
                  {selected.kind === 'practice' ? 'Eksperyment na następną rozmowę' : 'Jak to powtórzyć'}
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">{selected.experiment}</p>
              </div>}
            </section>
          )}

          {call.ai_next_step && <section className="space-y-2 border-t border-border-custom pt-5">
            <h3 className="text-sm font-semibold text-text-primary">Proponowany następny krok z klientem</h3>
            <p className="text-sm leading-7 text-text-secondary">{call.ai_next_step}</p>
          </section>}

          <section className="space-y-3 border-t border-border-custom pt-5">
            <label htmlFor="closer-review-notes" className="block text-base font-semibold text-text-primary">Moje wnioski na następną rozmowę</label>
            <p className="text-sm leading-relaxed text-text-secondary">Co powtórzę, co zrobię inaczej i jak to sprawdzę.</p>
            <ControlTextarea id="closer-review-notes" value={draft} onChange={event => setDraft(event.target.value)} maxLength={10000}
              disabled={saving} rows={5} placeholder="Na następnym callu przećwiczę…"
              className="w-full resize-y rounded-[var(--radius-md)] border border-border-custom bg-surface-2 p-4 text-base leading-7 text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-[var(--opacity-disabled)]" />
            {saveError && <p role="alert" className="text-sm text-danger">Nie udało się zapisać. Twoja notatka nadal jest tutaj — spróbuj ponownie.</p>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span role="status" className="text-xs text-text-secondary">{saving ? 'Zapisywanie…' : dirty ? 'Niezapisane zmiany' : call.review_notes ? 'Notatka zapisana' : 'Notatka widoczna tylko dla Ciebie'}</span>
              <Button className="shrink-0 whitespace-nowrap" onClick={() => onSaveNotes(draft)} loading={saving} disabled={!dirty} icon={<Save size={16} />} size="md">Zapisz notatkę</Button>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

