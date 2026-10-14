import { useState } from 'react';
import { ChefHat, Check, Sparkles, AlertCircle } from 'lucide-react';
import {getTodayWarsaw,shiftDateStr,type MealPlanDraft,type MealPlanState,type MealPreferences} from '@vanguard/domain';
import {ControlInput,ControlSelect} from '../../ui/ControlPrimitives';
import { MealShoppingListView } from './MealShoppingListView';
import { PlannedMealCard } from './PlannedMealCard';
import Button from '../../ui/Button';

interface MealPlannerViewProps {
  date: string;
  state: MealPlanState | null;
  targetKcal: number | null;
  targetProtein: number | null;
  isGenerating: boolean;
  isApproving: boolean;
  busy?:boolean;
  onGenerate: () => void;
  onApprove: (allergensReviewed?:boolean) => void;
  onResizeMeal: (mealKey: string, factor: number,date?:string) => void;
  onToggleShoppingItem: (productId: string) => void;
  days?:number;onDays?:(days:number)=>void;onStartDate?:(date:string)=>void;canGenerate?:boolean;preferences?:MealPreferences|null;
  reviewIdentity?:string;
}

export function MealPlannerView({
  date,
  state,
  targetKcal,
  targetProtein,
  isGenerating,
  isApproving,
  busy=false,
  onGenerate,
  onApprove,
  onResizeMeal,
  onToggleShoppingItem,
  days=7,onDays,onStartDate,canGenerate=true,preferences,reviewIdentity,
}: MealPlannerViewProps) {
  const [tab, setTab] = useState<'meals' | 'shopping'>('meals');
  const [selectedDate,setSelectedDate]=useState(date),[reviewedPlan,setReviewedPlan]=useState<string|null>(null);

  const activePlan: MealPlanDraft | null = state?.active ?? null;
  const draftPlan: MealPlanDraft | null = state?.draft ?? null;
  const displayPlan = tab === 'shopping' ? activePlan : draftPlan ?? activePlan;

  const currentDay = displayPlan?.days.find((d) => d.date === selectedDate) ?? displayPlan?.days.find(d=>d.date === date) ?? displayPlan?.days[0];
  const isDraftOnly = Boolean(draftPlan);
  const preferencesChanged=Boolean(displayPlan && preferences && displayPlan.preferencesRevision !== preferences.revision);
  const reviewKey=JSON.stringify([reviewIdentity,date,state?.revision,preferences?.revision]);
  const requiresAllergenReview=Boolean(preferences?.allergies.length),reviewed=reviewedPlan === reviewKey;

  return (
    <div className="rounded-2xl border border-white/5 bg-surface-1 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <ChefHat size={18} className="text-primary" />
            Jadłospis i lista zakupów
          </h3>
          <p className="text-xs text-text-muted">
            Plan posiłków pod trening i cele. Planowanie nie zapisuje spożycia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-2 p-0.5 border border-white/5">
            <Button
              variant={tab === 'meals' ? 'tonal' : 'ghost'}
              size="sm"
              onClick={() => setTab('meals')}
              className="h-7 px-3 text-xs"
            >
              Posiłki
            </Button>
            <Button
              variant={tab === 'shopping' ? 'tonal' : 'ghost'}
              size="sm"
              onClick={() => setTab('shopping')}
              className="h-7 px-3 text-xs"
            >
              Zakupy
            </Button>
          </div>

          <Button
            variant="tonal"
            size="sm"
            onClick={onGenerate}
            disabled={busy || isGenerating || !canGenerate}
            loading={isGenerating}
            icon={<Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />}
            className="h-8 border border-primary/30"
          >
            {isGenerating ? 'Dobieram…' : displayPlan ? 'Przelicz menu' : 'Ułóż jadłospis'}
          </Button>
        </div>
      </div>

      {onDays && onStartDate && <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Menu od<ControlInput className="mt-1 w-full" type="date" min={getTodayWarsaw()} max={shiftDateStr(getTodayWarsaw(),21)} value={date} disabled={busy} onChange={event=>onStartDate(event.target.value)}/></label>
        <label className="text-xs">Zakres jadłospisu<ControlSelect className="mt-1 w-full" value={days} disabled={busy} onChange={event=>onDays(Number(event.target.value))}><option value={1}>Jeden dzień</option><option value={7}>Cały tydzień</option></ControlSelect></label>
      </div>}
      {!canGenerate && <p className="text-xs text-warning">Najpierw zapisz potwierdzone preferencje żywienia powyżej.</p>}
      {preferencesChanged && <p role="status" className="text-xs text-warning">Preferencje zmieniły się od utworzenia tego menu. Sprawdź istniejące posiłki i ułóż nowy szkic.</p>}

      {!displayPlan ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">Brak zaplanowanego jadłospisu na ten dzień</p>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {targetKcal == null || targetProtein == null ? 'Przy generowaniu Sparky sprawdzi aktualne dane do celu energii i białka. Jeżeli ich brakuje, wskaże, co uzupełnić.' : `Propozycje pod cel ${targetKcal} kcal i ${targetProtein} g białka z biblioteki produktów. Sprawdź porcje i etykiety przed zatwierdzeniem.`}
          </p>
        </div>
      ) : tab === 'shopping' ? (
        <MealShoppingListView
          plan={displayPlan}
          checkedIds={state?.checkedProducts ?? []}
          onToggle={onToggleShoppingItem}
          disabled={busy}
        />
      ) : (
        <div className="space-y-4">
          {isDraftOnly && (
            <div className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertCircle size={16} />
                <span>To jest szkic jadłospisu. Zatwierdź, aby aktywować plan i listę zakupów.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={()=>onApprove(requiresAllergenReview?reviewed:undefined)}
                disabled={busy || isApproving || preferencesChanged || !canGenerate || requiresAllergenReview && !reviewed}
                loading={isApproving}
                icon={<Check size={14} />}
                className="h-7 px-3 text-xs"
              >
                {isApproving ? 'Zatwierdzam…' : 'Zatwierdź menu'}
              </Button>
            </div>
          )}
          {isDraftOnly && requiresAllergenReview && <label className="flex gap-2 text-xs"><ControlInput type="checkbox" checked={reviewed} onChange={event=>setReviewedPlan(event.target.checked?reviewKey:null)}/>Sprawdziłem skład i etykiety wszystkich proponowanych produktów względem zgłoszonych alergii.</label>}
          {displayPlan.days.length>1 && <label className="block text-xs">Podgląd dnia<ControlSelect className="mt-1 w-full" value={currentDay?.date ?? ''} onChange={event=>setSelectedDate(event.target.value)}>{displayPlan.days.map(day=><option key={day.date} value={day.date}>{day.date}</option>)}</ControlSelect></label>}

          {currentDay && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary bg-surface-2 p-2.5 rounded-xl border border-white/5">
                <span>
                  Suma dnia: <strong className="text-text-primary font-semibold">{currentDay.totals.calories} kcal</strong> (cel: {currentDay.target.calories} kcal)
                </span>
                <span>
                  Białko: <strong className="text-text-primary font-semibold">{currentDay.totals.protein} g</strong> (cel: {currentDay.target.protein} g)
                </span>
                <span>Węgle: {currentDay.totals.carbs} g · Tłuszcz: {currentDay.totals.fat} g</span>
              </div>

              <div className="space-y-3">
                {currentDay.meals.map((meal) => (
                  <PlannedMealCard
                    key={meal.key}
                    meal={meal}
                    onResizeMeal={(key,factor)=>onResizeMeal(key,factor,currentDay.date)}
                    disabled={busy}
                  />
                ))}
              </div>
            </div>
          )}

          {displayPlan.warnings && displayPlan.warnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {displayPlan.warnings.map((w, idx) => (
                <p key={idx} className="text-2xs text-text-muted">
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
