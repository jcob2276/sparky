import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WorkoutRestState {
  startedAt: number;
  endsAt: number;
  exercise: string;
  nextSet?: number;
}

/** Stan Live Activity: stoper całego treningu + opcjonalnie odliczanie przerwy. */
export interface WorkoutActivityState {
  workoutStartedAt: number;
  rest?: WorkoutRestState;
}

// Nazwa wtyczki natywnej zostaje (WorkoutRestActivity), żeby nie ruszać rejestracji w iOS.
const activity = registerPlugin<{
  show(state: WorkoutActivityState): Promise<void>;
  end(): Promise<void>;
}>('WorkoutRestActivity');

let pending = Promise.resolve();

export function syncWorkoutActivity(state: WorkoutActivityState | null): void {
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('WorkoutRestActivity')) return;

  pending = pending.then(() => (state ? activity.show(state) : activity.end()))
    .catch((error: unknown) => console.debug('[WorkoutActivity]', error));
}
