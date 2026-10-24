import { canonicalExerciseName, formatWarsawDate, isRunSport, type CoachRow, type GoalProgressReview, type HealthCoachContext } from '@vanguard/domain';
/** Targets are declarations. Raw records can inform a review without confirming a technique standard. */
export function reviewHealthGoal(row:CoachRow,context:HealthCoachContext,from:string,to:string): GoalProgressReview {
  const spec = row.measurement_spec && typeof row.measurement_spec === 'object' ? row.measurement_spec as CoachRow : {};
  const result:GoalProgressReview = {kpiId:String(row.id ?? ''),name:String(row.name ?? row.label ?? 'Cel'),target:Number(row.target),unit:String(row.unit ?? ''),
    standard:`${spec.variant ?? 'wariant niepotwierdzony'} / ${spec.standard ?? 'kryterium niepotwierdzone'}`,
    currentValue:null,status:'unassessed',evidenceRefs:[],note:'Brak aktualnego wyniku z potwierdzonym wariantem i standardem wykonania.'};
  const within = (date:string) => date >= from && date <= to && date <= context.localDate;
  if (spec.kind === 'run_10k') {
    const runs = (context.sources.strava_activities_clean.value ?? []).filter(activity =>
      within(formatWarsawDate(String(activity.start_date ?? ''))) && isRunSport(String(activity.sport_type))
      && Number(activity.distance)>=10000 && Number(activity.distance)<=10100 && Number(activity.elapsed_time)>0);
    const best = runs.sort((a,b)=>Number(a.elapsed_time)-Number(b.elapsed_time))[0];
    if (best) { result.currentValue=Number(best.elapsed_time);result.evidenceRefs=[{table:'strava_activities_clean',id:String(best.strava_id),observedAt:String(best.start_date),kind:'measured'}];
      result.note='Zapis aktywności około 10 km; wariant trasy i standard celu wymagają potwierdzenia. Czas obejmuje postoje.'; }
  } else if (spec.kind === 'body_fat') {
    const measurement = context.sources.body_metrics.value?.find(item=>within(String(item.date)) && typeof item.body_fat === 'number' && Number.isFinite(item.body_fat));
    if (measurement) {result.currentValue=Number(measurement.body_fat);result.evidenceRefs=[{table:'body_metrics',id:String(measurement.id),observedAt:String(measurement.date),kind:'self_reported'}];
      result.note='Zapisany poziom BF; potwierdź metodę pomiaru. Sam zapis liczby nie potwierdza porównywalności metod.';}
  } else if (['bench','pull_up','muscle_up'].includes(String(spec.kind))) {
    const candidates:Array<{value:number;id:string;date:string;reps:number}> = [];
    for (const workout of context.sources.workout_sessions.value ?? []) {
      if (!within(String(workout.date)) || !Array.isArray(workout.exercise_logs)) continue;
      for (const log of workout.exercise_logs) {
        if (!log || typeof log !== 'object' || Number(log.reps)<=0) continue;
        const name = canonicalExerciseName(String(log.exercise_name ?? ''));
        const matches = spec.kind === 'bench' ? name === canonicalExerciseName('Bench press')
          : spec.kind === 'pull_up' ? name === canonicalExerciseName(spec.variant === 'supinated' ? 'Podciąganie podchwytem' : spec.variant === 'pronated' ? 'Podciąganie nachwytem' : 'Podciąganie neutralne')
          : /muscle.?up/i.test(name) && !/band|assist|gum|transition|przejści/i.test(name);
        const value = Number(spec.kind === 'bench' ? log.weight : log.reps);
        if (matches && Number.isFinite(value) && value>0) candidates.push({value,id:String(log.id ?? workout.id),date:String(workout.date),reps:Number(log.reps)});
      }
    }
    const best = candidates.sort((a,b)=>b.value-a.value)[0];
    if (best) {result.currentValue=best.value;result.evidenceRefs=[{table:'exercise_logs',id:best.id,observedAt:best.date,kind:'measured'}];
      result.note=`Zapis serii: ${best.reps} powtórzeń. Technika, wariant i wymagany zapas potrzebują osobnego potwierdzenia; ten zapis nie zalicza celu.`;}
  }
  return result;
}
