import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { useMedicalUserContext } from '../../../lib/health/medicalApi';
import { buildMarkerSeries, type MedicalLabRow, type MedicalDocumentRow } from '../../../lib/health/medicalAnalytics';
import {
  buildMedicalTimeline,
  buildMedicalRecordSummary,
  buildPreventionSuggestions,
  type MedicalEventDraft,
  type PreventionSuggestion,
} from '../../../lib/health/medicalRecords';
import {
  createMedicalEvent,
  deleteMedicalEvent,
  fetchMedicalEvents,
  fetchPreventionActions,
  savePreventionAction,
  type PreventionActionStatus,
} from '../../../lib/health/medicalRecordsApi';

const EVENT_KEY = 'medical-events';
const ACTION_KEY = 'medical-prevention-actions';

export function useMedicalRecordsHub(
  userId: string | undefined,
  labs: MedicalLabRow[],
  documents: MedicalDocumentRow[],
) {
  const queryClient = useQueryClient();
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

  const series = useMemo(() => buildMarkerSeries(labs), [labs]);

  const createMutation = useMutation({
    mutationFn: (draft: MedicalEventDraft) => createMedicalEvent(userId as string, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [EVENT_KEY, userId] });
      notify('Wpis został dodany do Kartoteki.', 'success');
    },
    onError: () => notify('Nie udało się zapisać wpisu. Szkic pozostaje otwarty.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteMedicalEvent(userId as string, eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [EVENT_KEY, userId] });
      notify('Wpis został usunięty z Kartoteki.', 'success');
    },
    onError: () => notify('Nie udało się usunąć wpisu.', 'error'),
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

  const timeline = useMemo(
    () =>
      buildMedicalTimeline({
        events,
        documents,
        labs,
      }),
    [events, documents, labs],
  );

  const suggestions = useMemo(() => {
    const all = buildPreventionSuggestions({
      events,
      today: getTodayWarsaw(),
      age: userContext?.age ?? null,
      labs,
    });
    const hidden = new Set(
      (actionsQuery.data ?? [])
        .filter(
          (action) =>
            action.status !== 'snoozed' || !action.snoozedUntil || action.snoozedUntil >= getTodayWarsaw(),
        )
        .map((action) => action.suggestionKey),
    );
    return all.filter((suggestion) => !hidden.has(suggestion.id));
  }, [actionsQuery.data, events, labs, userContext?.age]);

  const summary = useMemo(
    () =>
      buildMedicalRecordSummary(
        timeline,
        suggestions.find((suggestion) => suggestion.dueOn)?.dueOn ?? null,
      ),
    [suggestions, timeline],
  );

  return {
    series,
    timeline,
    suggestions,
    summary,
    createMutation,
    deleteMutation,
    actionMutation,
    userContext,
  };
}
