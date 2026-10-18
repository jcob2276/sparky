import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {OuraNutritionFuelingView} from './OuraNutritionFuelingView';
import type { OuraHealthHubData } from './types';
vi.mock('../../../lib/health/mealPlanApi',()=>({fetchMealPlannerState:async()=>({storageDate:'2026-10-14',state:null}),approveMealPlan:vi.fn(),toggleShoppingItem:vi.fn(),resizeMealInPlanState:vi.fn()}));
vi.mock('../../../lib/health/mealPreferencesApi',()=>({fetchMealPreferences:async()=>({revision:1,confirmed:true,maxPrepMinutes:30,excluded:[],allergies:[],preferences:'',pattern:'any'}),saveMealPreferences:vi.fn()}));
it('shows loading instead of claiming that the food diary is empty', () => {
  render(<OuraNutritionFuelingView data={{ strainRow: null, oura: null, nutritionLoading: true }} />);
  expect(screen.getByRole('status')).toHaveTextContent('Wczytuję żywienie');
  expect(screen.queryByText('Brak dziennika jedzenia')).not.toBeInTheDocument();
});
it('keeps cached intake visible when a background refresh fails', () => {
  const nutrition = {
    date: '2026-10-14', calories: 1700, protein: 100, targetKcal: null, targetProtein: null,
    foodDataState: 'logged', foodComplete: false, trainingLabel: '',
  } as NonNullable<OuraHealthHubData['nutrition']>;
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <OuraNutritionFuelingView data={{ strainRow: null, oura: null, nutrition, nutritionError: 'network offline' }} />
  </QueryClientProvider>);
  expect(screen.getByText('Zapisano 1700 kcal · 100 g białka')).toBeInTheDocument();
  expect(screen.getByText('network offline')).toBeInTheDocument();
});
it('allows planning with existing targets before the first consumed meal',async()=>{
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <OuraNutritionFuelingView data={{userId:'owner-one',date:'2026-10-14',strainRow:null,oura:null,nutrition:{
      date:'2026-10-14',calories:0,protein:0,carbs:0,fat:0,targetKcal:2400,targetProtein:160,foodComplete:false,foodDataState:'missing',trainingLabel:'',todayFocus:null,
      avgFoodQuality:null,foodQualityAnalysis:null,addBackKcal:0,deficitKcal:0,inTaper:false,daysToMarathon:null,
      goalBodyFat:null,currentBodyFatEst:null,goalWeightKg:null,currentWeightKg:null,eventName:null,trajectory:null,trajectoryNote:null,
      runKmToday:0,gymToday:false,weightTrendKgWeek:null,plannedWeeklyLossKg:null,forecastWeight90d:null,forecastBf90d:null,daysToGoalEst:null,maintenanceKcal:null,targetUpdatedAt:null,
    }}}/>
  </QueryClientProvider>);
  expect(await screen.findByRole('button',{name:'Ułóż jadłospis'})).toBeEnabled();
});

it('renders calorie target vs actual intake, macro split breakdown, and meal timing relative to sleep window', () => {
  const nutrition = {
    date: '2026-10-14',
    calories: 2100,
    protein: 150,
    carbs: 220,
    fat: 65,
    targetKcal: 2500,
    targetProtein: 160,
    foodDataState: 'logged',
    foodComplete: true,
    trainingLabel: 'Bieg · 10.0 km',
    lastMealAt: '20:30',
    lastCaffeineAt: '14:00',
    caffeineMg: 100,
  } as NonNullable<OuraHealthHubData['nutrition']>;

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OuraNutritionFuelingView
        data={{
          date: '2026-10-14',
          userId: 'owner-one',
          strainRow: null,
          oura: null,
          enhanced: {
            date: '2026-10-14',
            bedtime_start: '2026-10-14T23:30:00+02:00',
            active_calories: 600,
            total_calories: 2700,
          } as never,
          nutrition,
        }}
      />
    </QueryClientProvider>
  );

  // Calorie target vs intake
  expect(screen.getByText('Zapisano 2100 kcal · 150 g białka')).toBeInTheDocument();
  expect(screen.getByText('Cel energii: 2500 kcal (szacunek)')).toBeInTheDocument();
  expect(screen.getByText('Pozostało 400 kcal')).toBeInTheDocument();

  // Macro split breakdown
  expect(screen.getByText('Podział makroskładników')).toBeInTheDocument();
  expect(screen.getByText('150 g')).toBeInTheDocument();
  expect(screen.getByText('220 g')).toBeInTheDocument();
  expect(screen.getByText('65 g')).toBeInTheDocument();

  // Meal timing relative to sleep window (20:30 to 23:30 is 3h)
  expect(screen.getByText(/Timing posiłków i kofeiny a sen/)).toBeInTheDocument();
  expect(screen.getByText('Godzina 20:30')).toBeInTheDocument();
  expect(screen.getByText(/3h przed snem/)).toBeInTheDocument();

  // Caffeine half-life estimate indication
  expect(screen.getByText(/Ostatnia: 14:00/)).toBeInTheDocument();
  expect(screen.getByText(/Szacunek na podstawie wpisów w dzienniku/)).toBeInTheDocument();
});

