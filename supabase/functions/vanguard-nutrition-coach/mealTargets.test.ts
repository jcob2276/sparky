import {assertEquals,assertThrows} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {buildHealthCoachContext} from '../_shared/healthCoachContext.ts';
import {buildMealPlanTargets} from './mealTargets.ts';
Deno.test('a real week has each date and protects the planned hard session without inventing future recovery',()=>{
  const context=buildHealthCoachContext({asOf:'2026-10-14T12:00:00Z',data:{training_plan_workouts:[
    {id:'hard',planned_date:'2026-10-16',workout_name:'Interwały',prescription:{intensity:'hard',durationMinutes:60}},
  ]}});
  const data={profile:{weekly_loss_kg:0.35,protein_g_per_kg:2},bm:[{date:'2026-10-14',weight:80}],
    oura:[{date:'2026-10-13',total_calories:2500}],nutr:[],dayReviews:[],runs:[],gym:[],todayOura:undefined,todayNutr:undefined,
    medicalContext:{today:'2026-10-14',rule:'',latest_labs:[],body_composition:null,documents:[]},
    today:'2026-10-14',targetDate:new Date('2026-10-14T12:00:00Z'),d30:'2026-09-17',context};
  const result=buildMealPlanTargets(data,'2026-10-14',7);
  assertEquals(result.targets.map(row=>row.date),['2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20']);
  assertEquals(result.targets[0].protein,160);
  assertEquals(result.targets[0].calories,2115);
  assertEquals(result.targets[2].calories,2500);
  assertEquals(result.trainingContext.includes('Interwały'),true);
  assertThrows(()=>buildMealPlanTargets(data,'2026-10-14',8));
  assertThrows(()=>buildMealPlanTargets(data,'2026-10-13',7));
});
Deno.test('future menus keep evidence freshness at the actual assessment date and completed hard sessions remain protected',()=>{
  const context=buildHealthCoachContext({asOf:'2026-10-14T12:00:00Z',data:{training_plan_workouts:[
    {id:'easy',planned_date:'2026-10-14',prescription:{intensity:'easy',durationMinutes:20}},
    {id:'hard',planned_date:'2026-10-14',completed:true,prescription:{intensity:'hard',durationMinutes:60}},
  ]}});
  const data={profile:{weekly_loss_kg:0.35,protein_g_per_kg:2},bm:[{date:'2026-09-19',weight:80}],
    oura:[{date:'2026-10-09',total_calories:2500}],nutr:[],dayReviews:[],runs:[],gym:[],todayOura:undefined,todayNutr:undefined,
    medicalContext:{today:'2026-10-14',rule:'',latest_labs:[],body_composition:null,documents:[]},
    today:'2026-10-14',targetDate:new Date('2026-10-14T12:00:00Z'),d30:'2026-09-17',context};
  const result=buildMealPlanTargets(data,data.today,7);
  assertEquals(result.targets.length,7);
  assertEquals(result.targets[0].calories,2500);
  assertEquals(result.targets[6].calories,2115);
  assertEquals(result.targets[6].protein,160);
});
