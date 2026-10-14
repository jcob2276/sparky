import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {getTodayWarsaw,shiftDateStr,parseMealPreferences,type MealPlanState,type MealPlanDraft} from '@vanguard/domain';
import {MealPlannerContainer} from './MealPlannerContainer';
import {fetchMealPlannerState,approveMealPlan,resizeMealInPlanState} from '../../../lib/health/mealPlanApi';
import {fetchMealPreferences,saveMealPreferences} from '../../../lib/health/mealPreferencesApi';
import {invokeEdge} from '../../../lib/supabase';
vi.mock('../../../lib/health/mealPlanApi',()=>({fetchMealPlannerState:vi.fn(),approveMealPlan:vi.fn(),resizeMealInPlanState:vi.fn(),toggleShoppingItem:vi.fn()}));
vi.mock('../../../lib/health/mealPreferencesApi',()=>({fetchMealPreferences:vi.fn(),saveMealPreferences:vi.fn()}));
vi.mock('../../../lib/supabase',()=>({invokeEdge:vi.fn()}));
vi.mock('../../../lib/notify',()=>({notify:vi.fn()}));
it('confirms preferences, drafts seven dates, reviews allergens, approves the week and reopens it the following day',async()=>{
  const today=getTodayWarsaw(),tomorrow=shiftDateStr(today,1);
  let preferences=parseMealPreferences(null),state:MealPlanState|null=null;
  const totals={calories:400,protein:10,carbs:60,fat:10,fiber:8};
  const plan:MealPlanDraft={notes:'Test',warnings:[],preferencesRevision:1,days:Array.from({length:7},(_,index)=>({
    date:shiftDateStr(today,index),totals,target:{calories:400,protein:10},meals:[{key:'breakfast',name:`Śniadanie dnia ${index+1}`,prepMinutes:10,instructions:'Ugotuj płatki w wodzie.',totals,
      ingredients:[{product:{id:'oats',name:'Płatki owsiane',source:'curated_pl',verified:true,...totals},grams:100,macros:totals}]}],
  }))};
  vi.mocked(fetchMealPreferences).mockImplementation(async()=>preferences);
  vi.mocked(saveMealPreferences).mockImplementation(async(_owner,value)=>{preferences={...value,revision:value.revision+1};return preferences;});
  vi.mocked(fetchMealPlannerState).mockImplementation(async()=>({storageDate:today,state}));
  vi.mocked(invokeEdge).mockImplementation(async()=>{state={revision:1,draft:plan,active:null,checkedProducts:[]};return {success:true,state};});
  vi.mocked(approveMealPlan).mockImplementation(async()=>{state={...state!,revision:2,active:state!.draft,draft:null};return state;});
  vi.mocked(resizeMealInPlanState).mockImplementation(async()=>state!);
  function visit(date:string){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MealPlannerContainer userId="owner-one" date={date} targetKcal={null} targetProtein={null}/></QueryClientProvider>);}
  const first=visit(today);
  expect(await screen.findByRole('button',{name:'Ułóż jadłospis'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Zgłoszone alergie/),{target:{value:'mleko'}});
  fireEvent.click(screen.getByLabelText(/Sprawdziłem preferencje/));
  fireEvent.click(screen.getByRole('button',{name:'Zapisz preferencje'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Ułóż jadłospis'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Ułóż jadłospis'}));
  await screen.findByText('Śniadanie dnia 1');
  expect(invokeEdge).toHaveBeenCalledWith('vanguard-nutrition-coach',expect.objectContaining({body:expect.objectContaining({startDate:today,days:7})}));
  expect(screen.getByLabelText('Podgląd dnia').querySelectorAll('option')).toHaveLength(7);
  fireEvent.change(screen.getByLabelText('Podgląd dnia'),{target:{value:tomorrow}});
  expect(screen.getByText('Śniadanie dnia 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'1.5x'}));
  await waitFor(()=>expect(resizeMealInPlanState).toHaveBeenCalledWith('owner-one',today,'breakfast',1.5,1,tomorrow));
  expect(screen.getByRole('button',{name:'Zatwierdź menu'})).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Sprawdziłem skład i etykiety/));
  fireEvent.click(screen.getByRole('button',{name:'Zatwierdź menu'}));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Zatwierdź menu'})).not.toBeInTheDocument());
  expect(approveMealPlan).toHaveBeenCalledWith('owner-one',today,`approve:${today}:1`,1,true);
  fireEvent.click(screen.getByRole('button',{name:'Zakupy'}));
  expect(screen.getByText('700 g')).toBeInTheDocument();
  first.unmount();visit(tomorrow);
  expect(await screen.findByText('Śniadanie dnia 2')).toBeInTheDocument();
  expect(fetchMealPlannerState).toHaveBeenLastCalledWith('owner-one',tomorrow);
});
it('stores a future replacement at its own start while preserving the current approved week',async()=>{
  const today=getTodayWarsaw(),future=shiftDateStr(today,2);
  const totals={calories:400,protein:10,carbs:60,fat:10,fiber:8};
  const plan=(date:string,name:string):MealPlanDraft=>({notes:'',warnings:[],preferencesRevision:1,days:[{date,totals,target:{calories:400,protein:10},meals:[{
    key:'breakfast',name,prepMinutes:10,instructions:'Ugotuj.',totals,ingredients:[{product:{id:'oats',name:'Płatki',source:'curated_pl',verified:true,...totals},grams:100,macros:totals}],
  }]}]});
  const current={...plan(today,'Bieżące śniadanie'),days:[...plan(today,'Bieżące śniadanie').days,...plan(future,'Dawne przyszłe śniadanie').days]};
  const rows=new Map<string,MealPlanState>([[today,{revision:3,active:current,draft:null}]]);
  vi.mocked(fetchMealPreferences).mockResolvedValue({...parseMealPreferences(null),confirmed:true,revision:1});
  vi.mocked(fetchMealPlannerState).mockImplementation(async(_owner,date)=>({storageDate:rows.has(date)?date:today,state:rows.get(date) ?? rows.get(today)!}));
  vi.mocked(invokeEdge).mockImplementation(async(_name,options)=>{
    const body=options?.body as {date:string};
    const state={revision:1,active:null,draft:plan(future,'Nowe przyszłe śniadanie')};rows.set(body.date,state);return {success:true,state};
  });
  vi.mocked(approveMealPlan).mockImplementation(async(_owner,date)=>{const row=rows.get(date)!;const state={...row,revision:row.revision+1,active:row.draft,draft:null};rows.set(date,state);return state;});
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MealPlannerContainer userId="owner-one" date={today} targetKcal={null} targetProtein={null}/></QueryClientProvider>);
  await screen.findByText('Bieżące śniadanie');
  fireEvent.change(screen.getByLabelText('Menu od'),{target:{value:future}});
  await screen.findByText('Dawne przyszłe śniadanie');
  fireEvent.click(screen.getByRole('button',{name:'Przelicz menu'}));
  await screen.findByText('Nowe przyszłe śniadanie');
  expect(invokeEdge).toHaveBeenLastCalledWith('vanguard-nutrition-coach',expect.objectContaining({body:expect.objectContaining({date:future,startDate:future})}));
  fireEvent.click(screen.getByRole('button',{name:'Zatwierdź menu'}));
  await waitFor(()=>expect(rows.get(future)?.active).not.toBeNull());
  expect(rows.get(today)?.active).toEqual(current);
  fireEvent.change(screen.getByLabelText('Menu od'),{target:{value:today}});
  await screen.findByText('Bieżące śniadanie');
});
