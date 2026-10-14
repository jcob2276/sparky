import {useMealPreferences} from './useMealPreferences';
import {MealPreferencesEditor} from './MealPreferencesEditor';
export function MealPreferencesContainer({userId}:{userId:string}) {
  const state=useMealPreferences(userId);
  if(state.loading) return <p className="text-xs">Wczytuję preferencje…</p>;
  if(!state.preferences) return <p role="alert" className="text-xs text-danger">{state.error ?? 'Nie udało się odczytać preferencji żywienia.'}</p>;
  return <MealPreferencesEditor key={state.preferences.revision} initial={state.preferences} saving={state.saving} error={state.error} onSave={state.save}/>;
}
