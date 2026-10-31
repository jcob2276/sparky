import { memo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../store/useStore';
import { dashboardKeys } from '../../lib/queryKeys';
import { getTodayWarsaw, getWarsawDayOfWeek } from '../../lib/date';
import { DEFAULT_TODAY_LAYOUT } from '../../lib/todayLayout';
import { useDashboardContext } from './context/DashboardContext';
import { useTodayLayout } from './hooks/useTodayLayout';
import { DashboardDzisView } from './DashboardDzisView';

function TodayContainer({ userId }: { userId: string }) {
  const state = useDashboardContext();
  const client = useQueryClient();
  const { query, save, saving } = useTodayLayout(userId);
  const [editing, setEditing] = useState(false);
  return <DashboardDzisView
    userId={userId}
    layout={query.data ?? DEFAULT_TODAY_LAYOUT}
    layoutLoading={query.isLoading}
    layoutError={query.isError}
    saving={saving}
    editing={editing}
    onEdit={() => setEditing(true)}
    onCloseEditor={() => setEditing(false)}
    onSaveLayout={save}
    onRetryLayout={() => { void query.refetch(); }}
    plan={{
      todayWin: state.todayWin,
      onUpdate: data => {
        if (data && 'id' in data) {
          client.setQueryData(dashboardKeys.main(userId), (old: unknown) => (
            old && typeof old === 'object' ? { ...old, todayWin: data } : old
          ));
        } else { void state.refresh(); }
      },
      planDaySignal: state.planDaySignal,
      onOpenShutdown: () => state.setShowShutdown(true),
    }}
    nutritionKey={state.nutritionKey}
    workoutKey={state.workoutKey}
    onFoodSaved={() => { void state.refresh(); state.setNutritionKey(key => key + 1); }}
    onOpenTerminy={() => state.navigate('/terminy')}
    weeklyReviewDue={getWarsawDayOfWeek(getTodayWarsaw()) === 'niedziela' && !state.taskReviewDoneThisWeek}
    onOpenWeeklyReview={() => state.setShowWeeklyReview(true)}
  />;
}

export const DashboardDzisTab = memo(function DashboardDzisTab() {
  const session = useSession();
  return session ? <TodayContainer key={session.user.id} userId={session.user.id} /> : null;
});
