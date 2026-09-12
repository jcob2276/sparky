import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '../../store/useStore';
import { useRetestSuggestions } from './hooks/useMedicalRetestContext';
import { useMedicalRecordData } from '../../lib/health/medicalHooks';
import { buildMarkerSeries } from '../../lib/health/medicalAnalytics';
import { savePreventionAction, importMedicalLabResults, type PreventionActionStatus } from '../../lib/health/medicalRecordsApi';
import { computeBiologyScoresLite } from '../../lib/getBased/biologyScoresLite';
import { getTodayWarsaw, shiftDateStr, warsawDayBoundsISO } from '../../lib/date';
import { useCreateCalendarEvent } from '../../lib/calendarApi';
import { notify } from '../../lib/notify';
import { ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import type { RetestSuggestion } from '../../lib/health/medicalRetestSuggestions';

// Subsections Components
import MedicalHeader from './sections/MedicalHeader';
import MedicalOverview from './sections/MedicalOverview';
import MedicalResultsTable from './sections/MedicalResultsTable';
import MedicalTrends from './sections/MedicalTrends';
import MedicalDocHistory from './sections/MedicalDocHistory';
import MedicalBiologyScoresSection from './sections/MedicalBiologyScoresSection';
import MedicalSuggestions from './sections/MedicalSuggestions';
import MedicalBodyComposition from './sections/MedicalBodyComposition';

import MedicalMarkerInspector from './sections/MedicalMarkerInspector';
import MedicalImport, { type ImportedMedicalResult, type LabResultEntryMeta } from './sections/MedicalImport';

const SNOOZE_DAYS = 30;
const CALENDAR_LEAD_DAYS = 14;

function LabHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] w-full border-b border-border-custom bg-background/95 backdrop-blur-[var(--blur-md)]">
      <div className="w-full max-w-[var(--ds-maxw-1600px)] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          aria-label="Wróć do Kartoteki"
          className="shrink-0 rounded-xl border border-border-custom p-2.5 text-text-muted"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black font-display uppercase tracking-tight">Laboratorium</h1>
        </div>
      </div>
    </header>
  );
}

export default function MedicalLaboratoryPage({ onBack }: { onBack?: () => void }) {
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { labs, bodyComposition, documents, loading, refresh } = useMedicalRecordData(userId);

  const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Derive series & calculations
  const series = useMemo(() => buildMarkerSeries(labs), [labs]);
  const biologyScores = useMemo(() => computeBiologyScoresLite(series), [series]);

  const { suggestions, loading: retestLoading } = useRetestSuggestions(
    userId,
    series,
    labs,
  );

  const persistAction = useMutation({
    mutationFn: (input: { suggestionKey: string; status: PreventionActionStatus; snoozedUntil?: string | null }) =>
      savePreventionAction({ userId: userId as string, sourceUrl: '', ...input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['medical-prevention-actions', userId] });
    },
    onError: () => notify('Nie udało się zapisać decyzji.', 'error'),
  });

  const createCalendarEvent = useCreateCalendarEvent();

  const handleHide = (suggestion: RetestSuggestion) =>
    persistAction.mutate({ suggestionKey: suggestion.id, status: 'dismissed' });

  const handleSnooze = (suggestion: RetestSuggestion) =>
    persistAction.mutate({
      suggestionKey: suggestion.id,
      status: 'snoozed',
      snoozedUntil: shiftDateStr(getTodayWarsaw(), SNOOZE_DAYS),
    });

  const handlePlanInCalendar = (suggestion: RetestSuggestion, note: string) => {
    if (!userId) return;
    const targetDate = shiftDateStr(getTodayWarsaw(), CALENDAR_LEAD_DAYS);
    const startMs = new Date(warsawDayBoundsISO(targetDate).fromISO).getTime() + 8 * 3_600_000;
    createCalendarEvent.mutate(
      {
        userId,
        event: {
          summary: `Badania: ${suggestion.title}`,
          start: new Date(startMs).toISOString(),
          end: new Date(startMs + 30 * 60_000).toISOString(),
          description: `${suggestion.reason}${note ? `\nPytanie do lekarza: ${note}` : ''}`,
          category: 'zdrowie',
        },
      },
      {
        onSuccess: () => notify('Dodano termin badania do kalendarza (za 14 dni, 8:00).', 'success'),
        onError: () => notify('Nie udało się dodać terminu do kalendarza.', 'error'),
      },
    );
  };

  const handleConfirmImport = async (results: ImportedMedicalResult[], meta: LabResultEntryMeta) => {
    if (!userId) return;
    await importMedicalLabResults({ userId, docName: meta.docName, resultDate: meta.resultDate, provider: meta.provider, results });
    await refresh();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBack = onBack ?? (() => navigate('/badania'));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col">
      <LabHeader onBack={handleBack} />

      <div className="flex-1 w-full max-w-[var(--ds-maxw-1600px)] mx-auto px-4 sm:px-6 lg:px-10 py-6 pb-16 space-y-10">
        {/* Header block (Completeness, attention and import trigger) */}
        <MedicalHeader
          series={series}
          documents={documents}
          onImportClick={() => setImportOpen(true)}
          onViewResults={() => scrollToSection('wyniki')}
          onPlanRetest={() => scrollToSection('sugestie')}
        />

        {/* Level 1: Przegląd */}
        <div id="przeglad">
          <MedicalOverview
            labs={labs}
            onActionClick={scrollToSection}
          />
        </div>

        {/* Level 2: Wyniki Table */}
        <div id="wyniki">
          <MedicalResultsTable
            series={series}
            onSelectMarker={setSelectedMarkerKey}
          />
        </div>

        {/* Level 3: Trendy */}
        <div id="trendy">
          <MedicalTrends series={series} />
        </div>

        {/* Level 4: Dokumenty history */}
        <div id="dokumenty">
          <MedicalDocHistory documents={documents} />
        </div>

        {/* Co warto badać section */}
        <div id="sugestie">
          <MedicalSuggestions
            suggestions={suggestions}
            loading={retestLoading}
            busyId={persistAction.isPending ? persistAction.variables?.suggestionKey : null}
            onHide={handleHide}
            onSnooze={handleSnooze}
            onPlanInCalendar={handlePlanInCalendar}
          />
        </div>

        {/* Eksperymentalne wskaźniki (Biology Scores) */}
        <div id="scores">
          <MedicalBiologyScoresSection scores={biologyScores} />
        </div>

        {/* Body compositions section */}
        <div id="cialo">
          <MedicalBodyComposition rows={bodyComposition} />
        </div>
      </div>

      {/* Marker side drawer details */}
      <MedicalMarkerInspector
        markerKey={selectedMarkerKey}
        series={series}
        onClose={() => setSelectedMarkerKey(null)}
      />

      {/* Add results wizard */}
      <MedicalImport
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        series={series}
        onConfirmImport={handleConfirmImport}
      />
    </div>
  );
}
