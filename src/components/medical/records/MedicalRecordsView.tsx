import { ArrowLeft, CalendarCheck, ChevronRight, FileText, FlaskConical, Plus, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';
import type { MedicalRecordSummary, MedicalTimelineItem, PreventionSuggestion } from '../../../lib/health/medicalRecords';

interface MedicalRecordsViewProps {
  timeline: MedicalTimelineItem[];
  summary: MedicalRecordSummary;
  suggestions: PreventionSuggestion[];
  onAdd: () => void;
  onSuggestion: (suggestion: PreventionSuggestion, status: 'done' | 'snoozed' | 'dismissed') => void;
  onOpenLabs: () => void;
}

const ICONS = {
  visit: Stethoscope,
  lab: FlaskConical,
  procedure: CalendarCheck,
  vaccination: CalendarCheck,
  other: FileText,
  document: FileText,
};

export default function MedicalRecordsView({
  timeline,
  summary,
  suggestions,
  onAdd,
  onSuggestion,
  onOpenLabs,
}: MedicalRecordsViewProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-custom bg-background/90 backdrop-blur-[var(--blur-md)]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Wróć" className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:bg-surface-2">
            <ArrowLeft size={19} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="ios-section-label">Zdrowie</p>
            <h1 className="text-xl font-bold tracking-tight">Kartoteka</h1>
          </div>
          <Button icon={<Plus size={16} />} onClick={onAdd}>Dodaj wpis</Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 pb-16 sm:px-6">
        <section aria-labelledby="passport-heading">
          <p className="ios-section-label">Twój obraz zdrowia</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="passport-heading" className="text-2xl font-bold tracking-tight">Paszport zdrowia</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Fakty zebrane z wizyt, dokumentów i badań — bez diagnozowania.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.specialties.map((specialty) => (
                <span key={specialty} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-text-secondary">
                  {specialty}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Card variant="surface">
              <p className="ios-section-label">Ostatni wpis</p>
              <p className="mt-2 text-lg font-bold">{summary.latestLabel ?? 'Brak wpisów'}</p>
              <p className="mt-1 text-sm text-text-muted">{summary.latestOn ?? 'Dodaj pierwsze zdarzenie'}</p>
            </Card>
            <Card variant="surface">
              <p className="ios-section-label">Ciągłość danych</p>
              <p className="mt-2 text-lg font-bold">{summary.recordCount} zdarzeń</p>
              <p className="mt-1 text-sm text-text-muted">{summary.specialtyCount} obszary opieki</p>
            </Card>
            <Card variant="surface">
              <p className="ios-section-label">Najbliższa kontrola</p>
              <p className="mt-2 text-lg font-bold">{summary.nextFollowUpOn ?? 'Nie zaplanowano'}</p>
              <p className="mt-1 text-sm text-text-muted">Na podstawie zapisanych zaleceń</p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="consider-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="ios-section-label">Profilaktyka</p>
              <h2 id="consider-heading" className="mt-1 text-2xl font-bold tracking-tight">Do rozważenia</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={onOpenLabs}>
              Wyniki badań
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <Card variant="surface" className="text-sm text-text-secondary">Brak aktualnych propozycji.</Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} variant="surface" className="space-y-3">
                  <div>
                    <h3 className="font-bold">{suggestion.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{suggestion.reason}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="tonal" onClick={() => onSuggestion(suggestion, 'done')}>Zrobione</Button>
                    <Button size="sm" variant="ghost" onClick={() => onSuggestion(suggestion, 'snoozed')}>Później</Button>
                    <Button size="sm" variant="ghost" onClick={() => onSuggestion(suggestion, 'dismissed')}>Nie dotyczy</Button>
                  </div>
                  {suggestion.sourceUrl ? (
                    <a className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-primary" href={suggestion.sourceUrl} target="_blank" rel="noreferrer">
                      {suggestion.sourceLabel} <ChevronRight size={13} />
                    </a>
                  ) : <p className="text-xs font-semibold text-text-muted">{suggestion.sourceLabel}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="timeline-heading">
          <p className="ios-section-label">Historia</p>
          <h2 id="timeline-heading" className="mt-1 text-2xl font-bold tracking-tight">Oś zdrowia</h2>
          <div className="mt-4 space-y-2">
            {timeline.length === 0 ? (
              <Card variant="surface" className="py-10 text-center">
                <Stethoscope className="mx-auto text-text-muted" />
                <p className="mt-3 font-bold">Kartoteka jest jeszcze pusta</p>
                <p className="mt-1 text-sm text-text-secondary">Dodaj pierwszą wizytę lub zaimportuj wyniki.</p>
              </Card>
            ) : timeline.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <article key={item.id} className="flex gap-3 rounded-[var(--radius-lg)] border border-border-custom bg-surface-1 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-bold">{item.title}</h3>
                      <time className="text-xs font-semibold text-text-muted">{item.occurredOn}</time>
                    </div>
                    {item.specialty && <p className="mt-0.5 text-xs font-semibold text-primary">{item.specialty}</p>}
                    {item.detail && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{item.detail}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
