import {assertEquals,assertStringIncludes} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {computeNutritionSignals} from './nutritionCompute.ts';
import {buildPushMessage} from './nutritionMessage.ts';
Deno.test('a nutrition summary labels missing targets and open intake without fictional deficit or BF dates',()=>{
  const {signals}=computeNutritionSignals({profile:{},bm:[],oura:[],nutr:[],dayReviews:[],runs:[],gym:[],todayOura:undefined,todayNutr:undefined,
    medicalContext:{today:'2026-10-14',rule:'',latest_labs:[],body_composition:null,documents:[]},today:'2026-10-14',targetDate:new Date('2026-10-14T12:00Z'),d30:'2026-09-17'});
  const message=buildPushMessage('2026-10-14',signals,null);
  assertStringIncludes(message,'Cel energii: nieustalony');assertStringIncludes(message,'Dziennik jest otwarty');
  assertEquals(/null|undefined|Niedolog|Cel BF za/.test(message),false);
});
