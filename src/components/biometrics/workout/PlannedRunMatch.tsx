import { useState } from 'react';
import { ControlSelect, Pressable } from '../../ui/ControlPrimitives';
import { matchingRuns, type PlannedWorkout, type RunningActivity } from '../../../lib/health/trainingPlanApi';
import { formatWarsawDate } from '../../../lib/date';
import { activitySourceLabel } from '@vanguard/domain';
export default function PlannedRunMatch({ workout, runs, busy, match }: {
  workout: PlannedWorkout; runs: RunningActivity[]; busy: boolean; match: (workout: PlannedWorkout, activityId: number) => void;
}) {
  const [selected, setSelected] = useState('');
  const candidates = matchingRuns(workout, runs);
  if (!candidates.length) return null;
  return <div className="space-y-2">
    <label className="block text-xs">To już wykonany bieg? Wybierz aktywność z importu.
      <ControlSelect value={selected} onChange={e => setSelected(e.target.value)} className="w-full rounded-lg bg-surface-2 p-2">
        <option value="">Bez dopasowania</option>
        {candidates.map(run => <option key={run.strava_id} value={String(run.strava_id)}>{formatWarsawDate(run.start_date!)} · {run.name} · {((run.distance ?? 0) / 1000).toFixed(1)} km · {activitySourceLabel(run)}</option>)}
      </ControlSelect>
    </label>
    <Pressable variant="secondary" size="sm" disabled={!selected || busy} onClick={() => match(workout, Number(selected))}>Potwierdź wykonanie tym biegiem</Pressable>
  </div>;
}
