import type {computeNutritionSignals} from './nutritionCompute.ts';
type Signals=ReturnType<typeof computeNutritionSignals>['signals'];
export function buildPushMessage(date:string,s:Signals,verdict:Record<string,unknown>|null):string {
  const t=s.today,lines=[`🍽️ Żywienie — ${date}`,'',
    t.target_kcal == null?'Cel energii: nieustalony':`Cel energii: ${t.target_kcal} kcal (szacunek)`,
    t.protein_floor_g == null?'Cel białka: potrzebny aktualny pomiar masy':`Cel białka: ${t.protein_floor_g} g`,
    t.intake_so_far == null?'Brak wpisów spożycia':`Zapisano dotąd ${Math.round(t.intake_so_far)} kcal`,
    t.food_complete?'Dzień potwierdzony jako kompletny.':'Dziennik jest otwarty; wpisy nie określają pełnego bilansu dnia.',
  ];
  if(s.energy.est_maintenance != null) lines.push(`Utrzymanie masy: około ${s.energy.est_maintenance} kcal · ${s.energy.maintenance_basis === 'estimated_wearable'?'szacunek zegarka':'szacunek bilansu energii'}`);
  if(s.activity.recovery_hold) lines.push('Dziś regeneracja ma pierwszeństwo przed redukcją.');
  else if(s.activity.key_training_day) lines.push('Cel uwzględnia kluczową sesję treningową.');
  lines.push(s.calibration.message);
  if(typeof verdict?.today_focus === 'string') lines.push('',verdict.today_focus.slice(0,600));
  return lines.join('\n');
}
