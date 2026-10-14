import { validateTrainingConstraints, recentPainReport, type TrainingConstraints, type HealthCoachContext } from '@vanguard/domain';
import { HttpError } from './http.ts';

export function trainingConstraintsFromContext(context: HealthCoachContext): TrainingConstraints {
  const row = context.sources.vanguard_preferences.value?.find(row => row.key === 'health_coach:constraints');
  if (typeof row?.value !== 'string') throw new HttpError(400, 'Najpierw potwierdź dni treningowe, sprzęt i ograniczenia w celach treningowych.');
  let raw;
  try { raw = JSON.parse(row.value); }
  catch { throw new HttpError(400, 'Nieprawidłowy zapis warunków treningu.'); }
  if (!raw || !Array.isArray(raw.availability) || !Array.isArray(raw.equipment) || !Array.isArray(raw.limitations)) throw new HttpError(400, 'Nieprawidłowy zapis warunków treningu.');
  if (!raw.availability.every((slot: unknown) => slot && typeof slot === 'object' && 'day' in slot && typeof slot.day === 'number' && 'minutes' in slot && typeof slot.minutes === 'number')
    || !raw.equipment.every((value: unknown) => typeof value === 'string') || !raw.limitations.every((value: unknown) => typeof value === 'string')) throw new HttpError(400, 'Nieprawidłowe wartości warunków treningu.');
  const constraints: TrainingConstraints = { revision: Number(raw.revision), availability: raw.availability, equipment: raw.equipment,
    limitations: raw.limitations, avoidExercises: Array.isArray(raw.avoidExercises) ? raw.avoidExercises.filter((value: unknown) => typeof value === 'string') : [],
    painReported: raw.painReported === true || recentPainReport(context) !== null };
  const errors = validateTrainingConstraints(constraints);
  if (errors.length) throw new HttpError(400, errors.join(' '));
  return constraints;
}
