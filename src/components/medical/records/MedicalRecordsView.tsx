import { ArrowLeft, FileUp, FlaskConical, Plus, Printer, Stethoscope, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import type {
  MedicalRecordSummary,
  MedicalTimelineItem,
  PreventionSuggestion,
} from '../../../lib/health/medicalRecords';
import MedicalPassportHeader from './MedicalPassportHeader';
import MedicalTimelineSection from './MedicalTimelineSection';

interface MedicalRecordsViewProps {
  timeline: MedicalTimelineItem[];
  summary: MedicalRecordSummary;
  suggestions: PreventionSuggestion[];
  onAdd: () => void;
  onSuggestion: (suggestion: PreventionSuggestion, status: 'done' | 'snoozed' | 'dismissed') => void;
  onOpenLabs: (markerKey?: string) => void;
  onOpenDoctorSummary: () => void;
  onImportLabs: () => void;
  onSelectItem: (item: MedicalTimelineItem) => void;
}

function MedicalViewHeader({
  onOpenLabs,
  onOpenDoctorSummary,
  onImportLabs,
  onAdd,
}: {
  onOpenLabs: () => void;
  onOpenDoctorSummary: () => void;
  onImportLabs: () => void;
  onAdd: () => void;
}) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-custom bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            aria-label="Wróć"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-2 border border-border-custom transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="ios-section-label">Zdrowie & Diagnostyka</p>
            <h1 className="text-lg sm:text-xl font-black font-display uppercase tracking-tight truncate">
              Kartoteka Medyczna
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center p-1 rounded-xl bg-surface-2 border border-border-custom">
          <Pressable className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-1 border border-border-custom shadow-xs text-xs font-bold text-text-primary">
            <Stethoscope size={13} className="text-primary" />
            <span>Kartoteka & Oś Zdrowia</span>
          </Pressable>
          <Pressable
            onClick={onOpenLabs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <FlaskConical size={13} />
            <span>Laboratorium & Markery</span>
          </Pressable>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer size={14} />}
            onClick={onOpenDoctorSummary}
            className="hidden sm:inline-flex text-xs"
            title="Wygeneruj podsumowanie dla lekarza"
          >
            Karta dla lekarza
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileUp size={14} />}
            onClick={onImportLabs}
            className="hidden lg:inline-flex text-xs"
          >
            Importuj wyniki
          </Button>
          <Button
            size="sm"
            icon={<Plus size={15} />}
            onClick={onAdd}
            className="text-xs font-bold"
          >
            Dodaj wpis
          </Button>
        </div>
      </div>

      <div className="md:hidden flex border-t border-border-custom/50 px-4 py-2 bg-surface-1/50 gap-2">
        <Pressable className="flex-1 py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary text-center">
          Kartoteka
        </Pressable>
        <Pressable
          onClick={onOpenLabs}
          className="flex-1 py-1.5 px-3 rounded-lg bg-surface-2 border border-border-custom text-xs font-bold text-text-muted text-center cursor-pointer"
        >
          Laboratorium
        </Pressable>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDoctorSummary}
          title="Drukuj kartę pacjenta"
          className="p-1.5"
        >
          <Printer size={16} />
        </Button>
      </div>
    </header>
  );
}

export default function MedicalRecordsView({
  timeline,
  summary,
  suggestions,
  onAdd,
  onSuggestion,
  onOpenLabs,
  onOpenDoctorSummary,
  onImportLabs,
  onSelectItem,
}: MedicalRecordsViewProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <MedicalViewHeader
        onOpenLabs={() => onOpenLabs()}
        onOpenDoctorSummary={onOpenDoctorSummary}
        onImportLabs={onImportLabs}
        onAdd={onAdd}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-6 pb-20 sm:px-6">
        <MedicalPassportHeader summary={summary} />

        <section aria-labelledby="consider-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border-custom/50 pb-3">
            <div>
              <span className="text-3xs font-black uppercase tracking-wider text-primary">Prewencja</span>
              <h2 id="consider-heading" className="text-xl font-black font-display uppercase tracking-tight text-text-primary mt-0.5">
                Profilaktyka i Następne Kroki
              </h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onOpenLabs()} className="text-xs text-primary">
              Przejdź do wyników badań <ChevronRight size={13} />
            </Button>
          </div>

          {suggestions.length === 0 ? (
            <Card variant="surface" className="text-xs text-text-muted p-4">
              Brak pilnych zaleceń profilaktycznych na ten moment.
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} variant="surface" padding="1.25rem" className="space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">{suggestion.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">{suggestion.reason}</p>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border-custom/40">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="tonal" onClick={() => onSuggestion(suggestion, 'done')}>
                        Zrobione
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onSuggestion(suggestion, 'snoozed')}>
                        Później
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onSuggestion(suggestion, 'dismissed')} className="text-text-muted">
                        Nie dotyczy
                      </Button>
                    </div>
                    {suggestion.sourceUrl ? (
                      <a
                        className="inline-flex items-center gap-1 text-3xs font-bold text-text-muted hover:text-primary"
                        href={suggestion.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {suggestion.sourceLabel} <ChevronRight size={11} />
                      </a>
                    ) : (
                      <p className="text-3xs font-bold text-text-muted">{suggestion.sourceLabel}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <MedicalTimelineSection
          timeline={timeline}
          onSelectItem={onSelectItem}
        />
      </main>
    </div>
  );
}
