import type { Tables } from '../database.types';
import { computeWeightSuggestion } from './progression';

export interface WorkoutSet {
  id: number;
  kg: string;
  reps: string;
  rir: string;
  msp: boolean;
}

export interface WorkoutExercise {
  id: number;
  name: string;
  tags: string[];
  sets: WorkoutSet[];
}

export interface WorkoutActivity {
  id: number;
  name: string;
  min: string;
  note: string;
}

export type ExerciseHistoryRow = Pick<Tables<'exercise_logs'>, 'weight' | 'reps' | 'rir' | 'set_number' | 'session_id' | 'muscle_tags' | 'exercise_name'> & {
  workout_sessions?: Pick<Tables<'workout_sessions'>, 'date'> | null;
};

export const newSet = (): WorkoutSet => ({
  id: Date.now() + Math.random(),
  kg: '',
  reps: '',
  rir: '',
  msp: false,
});

export const newExercise = (): WorkoutExercise => ({
  id: Date.now() + Math.random(),
  name: '',
  tags: [],
  sets: [newSet()],
});

export const newActivity = (): WorkoutActivity => ({
  id: Date.now() + Math.random(),
  name: '',
  min: '',
  note: '',
});

export function epley(
  kg: string | number | null | undefined,
  reps: string | number | null | undefined
): number | null {
  if (kg === null || kg === undefined || reps === null || reps === undefined) return null;
  const k = typeof kg === 'number' ? kg : parseFloat(kg);
  const r = typeof reps === 'number' ? reps : parseInt(reps);
  if (!k || !r || r <= 0) return null;
  return r === 1 ? k : k * (1 + r / 30);
}

function formatWeightLabel(weight: number | string | null | undefined): string {
  const w = Number(weight);
  if (Number.isNaN(w)) return '—';
  return w === 0 ? 'BW' : `${w}kg`;
}

export function formatLastSession(sets: ExerciseHistoryRow[] | null | undefined): string | null {
  if (!sets?.length) return null;
  const sorted = [...sets].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
  const ws = [...new Set(sorted.map((s) => Number(s.weight)))];
  const rs = [...new Set(sorted.map((s) => s.reps))];
  if (ws.length === 1 && rs.length === 1) {
    return `${formatWeightLabel(ws[0])} × ${rs[0]} × ${sorted.length} ser.`;
  }
  return sorted.map((s) => `${formatWeightLabel(s.weight)}×${s.reps}`).join(' · ');
}

const WELLNESS_NAMES = ['sauna', 'lodowata', 'zimny prysznic', 'stretching', 'foam rolling'];

export const isLogWellness = (l: { exercise_name: string; muscle_tags?: string[] }) =>
  (l.muscle_tags || []).includes('wellness') ||
  WELLNESS_NAMES.some(w => (l.exercise_name || '').toLowerCase().startsWith(w));

export function sessionVol(s: { exercise_logs: { exercise_name: string; weight: number | string | null; reps: number | string | null; muscle_tags?: string[] }[] }) {
  return (s.exercise_logs || []).reduce((sum, l) => {
    if (isLogWellness(l)) return sum;
    return sum + (Number(l.weight) || 0) * (Number(l.reps) || 0);
  }, 0);
}
