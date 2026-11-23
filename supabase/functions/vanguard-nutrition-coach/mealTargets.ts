import {shiftDateStr} from '@vanguard/domain';
import {HttpError} from '../_shared/http.ts';
import {computeNutritionSignals} from './nutritionCompute.ts';
/** Udział dziennego celu przypadający na jeden posiłek, gdy użytkownik prosi o konkretny posiłek, a nie o resztę dnia. */
const MEAL_SHARE:Record<string,number>={breakfast:0.25,lunch:0.35,dinner:0.30,snack:0.10};
export function buildMealPlanTargets(data:Parameters<typeof computeNutritionSignals>[0],startDate:string,days:number,remainingGoals?:{calories:number|null;protein:number|null},mealFocus?:string) {
  if(![1,7].includes(days) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(startDate))
    || !new Date(startDate).toISOString().startsWith(startDate) || startDate<data.today || startDate>shiftDateStr(data.today,21)) throw new HttpError(400,'Wybierz dziś lub datę w ciągu najbliższych trzech tygodni oraz 1 albo 7 dni.');
  if(remainingGoals && (days !== 1 || startDate !== data.today)) throw new HttpError(400,'Plan na pozostałą część dnia jest dostępny tylko na dziś.');
  const targets=Array.from({length:days},(_,index)=>{
    const date=shiftDateStr(startDate,index);
    const nutrition=computeNutritionSignals({...data,today:date,targetDate:new Date(`${date}T12:00:00Z`),
      todayOura:date === data.today?data.todayOura:undefined,todayNutr:date === data.today?data.todayNutr:undefined},data.today);
    const calories=remainingGoals?.calories ?? nutrition.targetKcal;
    const protein=remainingGoals?.protein ?? nutrition.proteinFloor;
    if(calories == null || protein == null) throw new HttpError(400,'Najpierw uzupełnij aktualny pomiar masy i dane do oszacowania energii.');
    const fixed=nutrition.fixedMacros;
    if (!remainingGoals) return fixed?{date,calories,protein,fat:fixed.fat,carbs:fixed.carbs}:{date,calories,protein};
    const remainingCalories = Math.round(calories - Math.max(0, Number(data.todayNutr?.calories) || 0));
    const remainingProtein = Math.max(0, Math.round((protein - Math.max(0, Number(data.todayNutr?.protein) || 0)) * 10) / 10);
    if (remainingCalories <= 0) throw new HttpError(400,'Dzisiejszy cel kalorii został już osiągnięty. Brak pozostałego budżetu do zaplanowania.');
    const left=(goal:number|undefined,eaten:unknown)=>goal==null?undefined:Math.max(0,Math.round(goal-Math.max(0,Number(eaten)||0)));
    const remainingFat=left(fixed?.fat,data.todayNutr?.fat),remainingCarbs=left(fixed?.carbs,data.todayNutr?.carbs);
    // Jeden posiłek ma dostać jego porcję dnia, nie cały pozostały budżet (obiad na 1650 kcal nie ma sensu).
    const share=mealFocus?MEAL_SHARE[mealFocus]:undefined;
    const part=<T extends number|undefined>(value:T,dayGoal:number|undefined):T|number=>share==null||value==null||dayGoal==null?value:Math.min(value,Math.round(dayGoal*share*10)/10);
    const row={date,calories:part(remainingCalories,calories) as number,protein:part(remainingProtein,protein) as number};
    return remainingFat==null||remainingCarbs==null?row:{...row,fat:part(remainingFat,fixed?.fat) as number,carbs:part(remainingCarbs,fixed?.carbs) as number};
  });
  const sessions=(data.context?.sources.training_plan_workouts.value ?? []).filter(row=>String(row.planned_date)>=startDate && String(row.planned_date)<=targets.at(-1)!.date && !row.skipped_at);
  return {targets,trainingContext:JSON.stringify({asOf:data.context?.asOf ?? data.today,futureRecovery:'unknown',sessions,
    notice:'Przyszłe cele są wstępnym szacunkiem z dzisiejszych pomiarów i deklaracji planu, nie pomiarem przyszłego zapotrzebowania.'})};
}
