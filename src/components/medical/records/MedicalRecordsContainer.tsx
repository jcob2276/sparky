import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '../../../store/useStore';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { useMedicalData } from '../hooks/useMedicalData';
import { useMedicalUserContext } from '../../../lib/health/medicalApi';
import {
  buildMedicalTimeline,
  buildMedicalRecordSummary,
  buildPreventionSuggestions,
  type MedicalEventDraft,
  type PreventionSuggestion,
} from '../../../lib/health/medicalRecords';
import {
  createMedicalEvent,
  fetchMedicalEvents,
  fetchPreventionActions,
  savePreventionAction,
  type PreventionActionStatus,
} from '../../../lib/health/medicalRecordsApi';
import MedicalLaboratoryPage from '../MedicalLaboratoryPage';
import MedicalQuickEntryModal from './MedicalQuickEntryModal';
import MedicalRecordsView from './MedicalRecordsView';

const EVENT_KEY = 'medical-events';
const ACTION_KEY = 'medical-prevention-actions';

export default function MedicalRecordsContainer() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const { labs, documents } = useMedicalData(userId);
  const { data: userContext } = useMedicalUserContext(userId);
  const eventsQuery = useQuery({
    queryKey: [EVENT_KEY, userId],
    queryFn: () => fetchMedicalEvents(userId as string),
    enabled: !!userId,
  });
  const actionsQuery = useQuery({
    queryKey: [ACTION_KEY, userId],
    queryFn: () => fetchPreventionActions(userId as string),
    enabled: !!userId,
  });
  const createMutation = useMutation({
    mutationFn: (draft: MedicalEventDraft) => createMedicalEvent(userId as string, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [EVENT_KEY, userId] });
      setQuickEntryOpen(false);
      notify('Wpis został dodany do Kartoteki.', 'success');
    },
    onError: () => notify('Nie udało się zapisać wpisu. Szkic pozostaje otwarty.', 'error'),
  });
  const actionMutation = useMutation({
    mutationFn: (input: { suggestion: PreventionSuggestion; status: PreventionActionStatus }) =>
      savePreventionAction({
        userId: userId as string,
        suggestionKey: input.suggestion.id,
        status: input.status,
        sourceUrl: input.suggestion.sourceUrl,
        snoozedUntil: input.status === 'snoozed' ? input.suggestion.dueOn : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [ACTION_KEY, userId] });
    },
    onError: () => notify('Nie udało się zapisać decyzji.', 'error'),
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const timeline = useMemo(() => buildMedicalTimeline({
    events,
    documents,
    labs,
  }), [events, documents, labs]);
  const suggestions = useMemo(() => {
    const all = buildPreventionSuggestions({
      events,
      today: getTodayWarsaw(),
      age: userContext?.age ?? null,
    });
    const hidden = new Set((actionsQuery.data ?? [])
      .filter((action) => action.status !== 'snoozed' || !action.snoozedUntil || action.snoozedUntil >= getTodayWarsaw())
      .map((action) => action.suggestionKey));
    return all.filter((suggestion) => !hidden.has(suggestion.id));
  }, [actionsQuery.data, events, userContext?.age]);
  const summary = useMemo(() => buildMedicalRecordSummary(
    timeline,
    suggestions.find((suggestion) => suggestion.dueOn)?.dueOn ?? null,
  ), [suggestions, timeline]);

  if (showLabs) return <MedicalLaboratoryPage onBack={() => setShowLabs(false)} />;

  return (
    <>
      <MedicalRecordsView
        timeline={timeline}
        summary={summary}
        suggestions={suggestions}
        onAdd={() => setQuickEntryOpen(true)}
        onOpenLabs={() => setShowLabs(true)}
        onSuggestion={(suggestion, status) => actionMutation.mutate({ suggestion, status })}
      />
      {quickEntryOpen && (
        <MedicalQuickEntryModal
          isOpen
          saving={createMutation.isPending}
          onClose={() => setQuickEntryOpen(false)}
          onSave={(draft) => createMutation.mutate(draft)}
        />
      )}
    </>
  );
}
