import {ControlInput,ControlTextarea,Pressable} from '../../ui/ControlPrimitives';
import type {useFoodPlanningAssistant} from './useFoodPlanningAssistant';
type Props=ReturnType<typeof useFoodPlanningAssistant>;
export function FoodPlanningAssistantView(state:Props) {
  return <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3" aria-label="Pomysły na posiłki">
    <h3 className="text-sm font-semibold">Menu restauracji lub składniki w domu</h3>
    <div className="flex gap-2">
      <Pressable variant="secondary" size="sm" aria-pressed={state.mode === 'menu'} disabled={state.busy} onClick={()=>state.setMode('menu')}>Menu restauracji</Pressable>
      <Pressable variant="secondary" size="sm" aria-pressed={state.mode === 'fridge'} disabled={state.busy} onClick={()=>state.setMode('fridge')}>Moja lodówka</Pressable>
    </div>
    <label className="block text-xs space-y-1">{state.mode === 'menu'?'Wklej pozycje z menu i swoje uwagi':'Podaj składniki, ilości oraz swoje uwagi'}
      <ControlTextarea value={state.text} maxLength={8000} disabled={state.busy} onChange={event=>state.setText(event.target.value)} className="w-full rounded-lg bg-surface-2 p-2" rows={4} />
    </label>
    <label className="block text-xs space-y-1">Dodaj zdjęcie menu lub składników
      <ControlInput type="file" accept="image/*" disabled={state.busy} onChange={event=>state.setFile(event.target.files?.[0] ?? null)} className="block w-full" />
    </label>
    {state.native && <Pressable variant="secondary" size="sm" disabled={state.busy} onClick={()=>void state.camera()}>Zrób zdjęcie</Pressable>}
    {state.file && <p className="text-xs">{state.file.name} <Pressable variant="ghost" size="sm" disabled={state.busy} onClick={()=>state.setFile(null)}>Usuń zdjęcie</Pressable></p>}
    <Pressable variant="primary" size="sm" disabled={state.busy || (!state.file && !state.text.trim())} onClick={()=>void state.analyze()}>{state.busy?'Analizuję…':'Zaproponuj dania'}</Pressable>
    {state.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
    {state.menu && state.mode === 'menu' && <div className="space-y-3" aria-live="polite">
      <p className="text-sm">{state.menu.summary}</p>
      {!state.menu.dishes.length && <p className="text-xs">Brak rozpoznanych propozycji. Dodaj czytelniejsze zdjęcie lub treść menu.</p>}
      {state.menu.dishes.map(dish=><article key={dish.id} className="rounded-xl border border-border-custom p-3 space-y-1">
        <h4 className="text-sm font-semibold">{dish.name}</h4>
        <p className="text-xs">{dish.estimatedKcal == null?'Brak oszacowania energii':`Około ${dish.estimatedKcal} kcal`} · białko {dish.estimatedProtein ?? '—'} g</p>
        <p className="text-xs text-text-secondary">{dish.whyRecommended}</p>
        {dish.waiterTip && <p className="text-xs">Do ustalenia z obsługą: {dish.waiterTip}</p>}
      </article>)}
      <p className="text-xs text-text-secondary">{state.menu.userNotice}</p>
    </div>}
    {state.fridge && state.mode === 'fridge' && <div className="space-y-3" aria-live="polite">
      <p className="text-xs">Rozpoznane składniki: {state.fridge.detectedIngredients.map(item=>`${item.name}${item.estimatedGrams == null?'':` (~${item.estimatedGrams} g)`}`).join(', ') || 'brak'}</p>
      {!state.fridge.suggestions.length && <p className="text-xs">Brak propozycji. Doprecyzuj składniki i ilości.</p>}
      {state.fridge.suggestions.map(recipe=><article key={recipe.id} className="rounded-xl border border-border-custom p-3 space-y-1">
        <h4 className="text-sm font-semibold">{recipe.name}</h4>
        <p className="text-xs">{recipe.prepMinutes == null?'Czas nieznany':`Około ${recipe.prepMinutes} min`} · {recipe.estimatedKcal ?? '—'} kcal · białko {recipe.protein ?? '—'} g (szacunki)</p>
        <p className="text-xs">Użyj: {recipe.ingredientsUsed.join(', ')}</p>
        {!!recipe.missingIngredients.length && <p className="text-xs">Brakuje: {recipe.missingIngredients.join(', ')}</p>}
        <p className="text-xs text-text-secondary">{recipe.instructions}</p>
      </article>)}
      <p className="text-xs text-text-secondary">{state.fridge.uncertaintyNotice}</p>
    </div>}
    <p className="text-xs text-text-muted">Propozycje nie zapisują spożycia. Gdy zjesz posiłek, wpisz rzeczywistą porcję w dzienniku.</p>
  </section>;
}
