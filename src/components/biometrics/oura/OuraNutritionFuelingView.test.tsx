import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {OuraNutritionFuelingView} from './OuraNutritionFuelingView';
vi.mock('../../../lib/health/mealPlanApi',()=>({fetchMealPlannerState:async()=>({storageDate:'2026-10-14',state:null}),approveMealPlan:vi.fn(),toggleShoppingItem:vi.fn(),resizeMealInPlanState:vi.fn()}));
vi.mock('../../../lib/health/mealPreferencesApi',()=>({fetchMealPreferences:async()=>({revision:1,confirmed:true,maxPrepMinutes:30,excluded:[],allergies:[],preferences:'',pattern:'any'}),saveMealPreferences:vi.fn()}));
it('allows planning with existing targets before the first consumed meal',async()=>{
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <OuraNutritionFuelingView data={{userId:'owner-one',date:'2026-10-14',strainRow:null,oura:null,nutrition:{
      date:'2026-10-14',calories:0,protein:0,targetKcal:2400,targetProtein:160,foodComplete:false,foodDataState:'missing',trainingLabel:'',todayFocus:null,
      avgFoodQuality:null,foodQualityAnalysis:null,addBackKcal:0,deficitKcal:0,inTaper:false,daysToMarathon:null,
      goalBodyFat:null,currentBodyFatEst:null,goalWeightKg:null,currentWeightKg:null,eventName:null,trajectory:null,trajectoryNote:null,
      runKmToday:0,gymToday:false,weightTrendKgWeek:null,plannedWeeklyLossKg:null,forecastWeight90d:null,forecastBf90d:null,daysToGoalEst:null,maintenanceKcal:null,targetUpdatedAt:null,
    }}}/>
  </QueryClientProvider>);
  expect(await screen.findByRole('button',{name:'Ułóż jadłospis'})).toBeEnabled();
});
