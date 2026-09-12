import { useMemo } from 'react';
import { getTodayWarsaw } from '../../../lib/date';
import { groupRowsByDate, type MarkerSeries, type MedicalLabRow } from '../../../lib/health/medicalAnalytics';
import { findLatestFullPanel } from '../../../lib/health/medicalRetestContext';
import { filterVisibleSuggestions } from '../../../lib/health/medicalRecords';
import { useMedicalUserContext } from '../../../lib/health/medicalApi';
import {
  buildRetestSuggestions,
  type MedicalUserContext,
  type RetestSuggestion,
} from '../../../lib/health/medicalRetestSuggestions';
import { useMedicalPreventionActions } from '../../../lib/health/medicalHooks';

const EMPTY_CONTEXT: MedicalUserContext = {
  age: null,
  sex: null,
  activeProjectNames: [],
  sprintGoal: null,
  trainingHint: null,
};

export function useRetestSuggestions(userId: string | undefined, series: MarkerSeries[], labs: MedicalLabRow[]) {
  const { data: ctx = EMPTY_CONTEXT, isLoading: ctxLoading } = useMedicalUserContext(userId);
  const actionsQuery = useMedicalPreventionActions(userId);

  const fullPanel = useMemo(
    () => (labs.length ? findLatestFullPanel(groupRowsByDate(labs)) : null),
    [labs],
  );

  const suggestions = useMemo<RetestSuggestion[]>(() => {
    if (!labs.length) return [];
    const built = buildRetestSuggestions({ series, fullPanel, user: ctx });
    return filterVisibleSuggestions(built, actionsQuery.data ?? [], getTodayWarsaw());
  }, [labs, series, fullPanel, ctx, actionsQuery.data]);

  return { suggestions, fullPanel, userContext: ctx, loading: ctxLoading };
}
