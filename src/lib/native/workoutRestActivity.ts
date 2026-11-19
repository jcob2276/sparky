import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WorkoutRestActivityState {
  startedAt: number;
  endsAt: number;
  exercise: string;
  nextSet?: number;
}

const activity = registerPlugin<{
  show(state: WorkoutRestActivityState): Promise<void>;
  end(): Promise<void>;
}>('WorkoutRestActivity');

let pending = Promise.resolve();

export function syncWorkoutRestActivity(state: WorkoutRestActivityState | null): void {
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('WorkoutRestActivity')) return;

  pending = pending.then(() => state && state.endsAt > Date.now() ? activity.show(state) : activity.end())
    .catch((error: unknown) => console.debug('[WorkoutRestActivity]', error));
}
