import {shiftDateStr} from '@vanguard/domain';
import {HttpError} from '../_shared/http.ts';
import {computeNutritionSignals} from './nutritionCompute.ts';
export function buildMealPlanTargets(data:Parameters<typeof computeNutritionSignals>[0],startDate:string,days:number) {
  if(![1,7].includes(days) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(startDate))
    || !new Date(startDate).toISOString().startsWith(startDate) || startDate<data.today || startDate>shiftDateStr(data.today,21)) throw new HttpError(400,'Wybierz dziś lub datę w ciągu najbliższych trzech tygodni oraz 1 albo 7 dni.');
  const targets=Array.from({length:days},(_,index)=>{
    const date=shiftDateStr(startDate,index);
    const nutrition=computeNutritionSignals({...data,today:date,targetDate:new Date(`${date}T12:00:00Z`),
      todayOura:date === data.today?data.todayOura:undefined,todayNutr:date === data.today?data.todayNutr:undefined},data.today);
    if(nutrition.targetKcal == null || nutrition.proteinFloor == null) throw new HttpError(400,'Najpierw uzupełnij aktualny pomiar masy i dane do oszacowania energii.');
    return {date,calories:nutrition.targetKcal,protein:nutrition.proteinFloor};
  });
  const sessions=(data.context?.sources.training_plan_workouts.value ?? []).filter(row=>String(row.planned_date)>=startDate && String(row.planned_date)<=targets.at(-1)!.date && !row.skipped_at);
  return {targets,trainingContext:JSON.stringify({asOf:data.context?.asOf ?? data.today,futureRecovery:'unknown',sessions,
    notice:'Przyszłe cele są wstępnym szacunkiem z dzisiejszych pomiarów i deklaracji planu, nie pomiarem przyszłego zapotrzebowania.'})};
}
