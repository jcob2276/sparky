import {useMealPlanner} from './useMealPlanner';
import {MealPlannerView} from './MealPlannerView';
export function MealPlannerContainer(props:{userId:string;date:string;targetKcal:number|null;targetProtein:number|null}) {
  const state=useMealPlanner(props.userId,props.date);
  if (state.isLoading && !state.state) return <p className="text-xs text-text-muted">Wczytuję jadłospis…</p>;
  return <div className="space-y-2">
    {state.error && <p role="alert" className="text-xs text-danger">Nie udało się odczytać jadłospisu. Odśwież widok.</p>}
    <MealPlannerView {...props} {...state} />
  </div>;
}
