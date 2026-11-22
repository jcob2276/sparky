import {useState} from 'react';
import type {MealPreferences} from '@vanguard/domain';
import {ControlInput,ControlTextarea} from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
const patterns = [
  { value: 'any', label: 'Bez ograniczeń' },
  { value: 'vegetarian', label: 'Wegetariański' },
  { value: 'vegan', label: 'Wegański' },
] as const;

interface Props {initial:MealPreferences;saving:boolean;error:string|null;onSave:(value:MealPreferences)=>void}
export function MealPreferencesEditor({initial,saving,error,onSave}:Props) {
  const [value,setValue]=useState(initial),[excluded,setExcluded]=useState(initial.excluded.join(', ')),[allergies,setAllergies]=useState(initial.allergies.join(', '));
  const change=(patch:Partial<MealPreferences>)=>setValue({...value,...patch,confirmed:false});
  const list=(raw:string)=>raw.split(',').map(item=>item.trim()).filter(Boolean);
  return <details className="rounded-lg border border-border-custom bg-surface p-4" open={!initial.confirmed}>
    <summary className="cursor-pointer text-sm font-semibold">Preferencje i ograniczenia żywienia</summary>
    <div className="mt-3 space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-xs">Sposób jedzenia</legend>
        <div className="flex flex-wrap gap-2">
          {patterns.map(({ value: pattern, label }) => (
            <Button key={pattern} size="sm" variant={(value.pattern ?? 'any') === pattern ? 'tonal' : 'secondary'}
              aria-pressed={(value.pattern ?? 'any') === pattern} disabled={saving}
              onClick={() => change({ pattern })}>{label}</Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs">Czas przygotowania do</legend>
        <div className="flex flex-wrap gap-2">
          {[15, 30, 45, 60, 90].map((minutes) => (
            <Button key={minutes} size="sm" variant={value.maxPrepMinutes === minutes ? 'tonal' : 'secondary'}
              aria-pressed={value.maxPrepMinutes === minutes} disabled={saving}
              onClick={() => change({ maxPrepMinutes: minutes })}>{minutes} min</Button>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs">Wykluczone produkty, po przecinku<ControlInput className="mt-1 w-full" maxLength={1000} value={excluded} disabled={saving} onChange={event=>{setExcluded(event.target.value);change({});}}/></label>
      <label className="block text-xs">Zgłoszone alergie, po przecinku; puste pole oznacza, że ich nie zgłaszasz<ControlInput className="mt-1 w-full" maxLength={1000} value={allergies} disabled={saving} onChange={event=>{setAllergies(event.target.value);change({});}}/></label>
      <label className="block text-xs">Co lubisz i inne uwagi<ControlTextarea className="mt-1 w-full" maxLength={1000} rows={3} value={value.preferences} disabled={saving} onChange={event=>change({preferences:event.target.value})}/></label>
      <label className="flex items-start gap-2 text-xs"><ControlInput type="checkbox" checked={value.confirmed} disabled={saving} onChange={event=>setValue({...value,confirmed:event.target.checked})}/>Sprawdziłem preferencje, wykluczenia i deklarację alergii powyżej.</label>
      <p className="text-xs text-text-muted">Sparky wyklucza rozpoznane nazwy składników. Nazwa produktu i zdjęcie nie potwierdzają pełnego składu ani braku zanieczyszczeń krzyżowych; przed użyciem sprawdź etykietę lub obsługę restauracji.</p>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <Button disabled={!value.confirmed || saving} loading={saving} onClick={()=>onSave({...value,excluded:list(excluded),allergies:list(allergies)})}>Zapisz preferencje</Button>
    </div>
  </details>;
}
