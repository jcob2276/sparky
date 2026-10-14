import { describe, expect, it } from 'vitest';
import { plannedWorkoutInitial, matchingRuns } from './trainingPlanApi';
describe('planned workout logger handoff', () => {
  it('carries plan identity and targets without recording prescribed sets as actual performance', () => {
    const initial = plannedWorkoutInitial('plan-session', {
      key: 's1', date: '2026-10-15', name: 'Upper', type: 'strength', goal: 'Bench',
      durationMinutes: 45, warmupMinutes: 8, cooldownMinutes: 5, intensity: 'moderate', notes: 'RIR 3',
      exercises: [{ name: 'Bench Press', sets: 3, reps: 8, rir: 3, restSeconds: 120, weightKg: 70, equipment: ['barbell'], pattern: 'upper' }],
    });
    expect(initial.planWorkoutId).toBe('plan-session');
    expect(initial.exercises[0].sets).toHaveLength(3);
    expect(initial.exercises[0].sets[0].reps).toBe('');
    expect(initial.exercises[0].sets[0].kg).toBe('');
    expect(initial.exercises[0].sets[0].prescription?.reps).toBe(8);
  });
  it('matches real Intervals runs by Warsaw date and never requires a Strava account', () => {
    const run = {strava_id:12,name:'Bieg',start_date:'2026-10-13T23:00:00Z',distance:5000,sport_type:'Run',source:'garmin_intervals'};
    expect(matchingRuns({planned_date:'2026-10-15'},[run])).toEqual([run]);
    expect(matchingRuns({planned_date:'2026-10-17'},[run])).toEqual([]);
    expect(matchingRuns({planned_date:'2026-10-15'},[{...run,distance:0},{...run,sport_type:'Ride'}])).toEqual([]);
  });
});
